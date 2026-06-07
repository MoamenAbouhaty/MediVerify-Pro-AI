const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const crypto = require('crypto');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function generateSerial() {
  return 'MV-' + crypto.randomBytes(2).toString('hex').toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
}

function generateExpiry() {
  const date = new Date();
  date.setMonth(date.getMonth() + Math.floor(Math.random() * 30) + 6);
  return date;
}

const medicinePool = [
  { name: 'Paracetamol 500mg', brand: 'GSK Pharmaceuticals' },
  { name: 'Ibuprofen 400mg', brand: 'Pfizer Inc.' },
  { name: 'Amoxicillin 250mg', brand: 'Sandoz' },
  { name: 'Omeprazole 20mg', brand: 'AstraZeneca' },
  { name: 'Metformin 500mg', brand: 'Teva Pharmaceuticals' },
  { name: 'Aspirin 100mg', brand: 'Bayer AG' },
  { name: 'Cetirizine 10mg', brand: 'UCB Pharma' },
  { name: 'Azithromycin 500mg', brand: 'Pfizer Inc.' },
  { name: 'Vitamin D3 1000IU', brand: 'Nature Made' },
  { name: 'Lisinopril 10mg', brand: 'Merck & Co.' },
];

router.post('/suggest', async (req, res) => {
  try {
    const { name } = req.body;
    let medName = name;
    let medBrand = 'AI Generated';

    if (!medName) {
      const pick = medicinePool[Math.floor(Math.random() * medicinePool.length)];
      medName = pick.name;
      medBrand = pick.brand;
    } else {
      const found = medicinePool.find(m => m.name.toLowerCase().includes(name.toLowerCase()));
      if (found) medBrand = found.brand;
    }

    let serialNumber = generateSerial();
    let tries = 0;
    while (await Medicine.findOne({ serialNumber }) && tries < 10) {
      serialNumber = generateSerial();
      tries++;
    }

    const newMed = await Medicine.create({
      name: medName,
      brand: medBrand,
      serialNumber,
      expiryDate: generateExpiry(),
      description: 'AI generated pharmaceutical entry',
    });

    res.json({ success: true, medicine: newMed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const SYSTEM_PROMPT = `You are MediVerify Pro AI, a medicine information and safety assistant.

Rules:
- Never diagnose diseases.
- Never infer symptoms from a medicine name.
- Never infer symptoms from a drug indication.
- Never guess the user's medical condition.
- Only use information explicitly provided by the user.
- If symptoms are not explicitly provided, do not generate "Possible Causes".
- If symptoms are not provided, only explain the medicine.
- If the user only mentions taking a medicine, ask what symptoms they are experiencing before making recommendations.
- Recommend OTC medicines only when symptoms are clearly described.
- Never invent drug interactions.
- If interaction information cannot be verified, clearly state that.
- Always mention important warnings and contraindications.
- Do not recommend prescription medications.
- Do not recommend controlled substances.
- Keep responses concise, professional, and medically cautious.
- Use web search to get accurate, up-to-date information about any medicine mentioned.

Response Format:

When a medicine name is provided:

Medicine:
Active Ingredients:
Uses:
Typical Adult Dosage:
Warnings:
Drug Interactions:
When to Seek Medical Advice:

When symptoms are provided:

Possible Causes:
OTC Options:
Safety Warnings:
When to See a Doctor:

When the user only says they took a medicine:

Additional Information Needed:
- What symptoms are you experiencing?
- How long have you had them?
- What is your age?

Always end with:
⚕ Consult a licensed physician before taking any medication.`;

async function runWithSearch(messages) {
  const tools = [
    {
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the web for accurate, up-to-date pharmaceutical information about a medicine, drug, or symptom.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query, e.g. "Ibuprofen 400mg dosage warnings drug interactions"'
            }
          },
          required: ['query']
        }
      }
    }
  ];

  const firstResponse = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 700,
    temperature: 0.2,
    messages,
    tools,
    tool_choice: 'auto'
  });

  const firstMessage = firstResponse.choices[0].message;

  if (firstMessage.tool_calls && firstMessage.tool_calls.length > 0) {
    const toolCall = firstMessage.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments);
    const query = args.query;

    let searchResult = '';
    try {
      const searchRes = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY || ''
          }
        }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const results = (searchData.web?.results || []).slice(0, 4);
        searchResult = results
          .map((r, i) => `[${i + 1}] ${r.title}\n${r.description}`)
          .join('\n\n');
      }
    } catch {
      searchResult = 'Search unavailable. Using internal knowledge only.';
    }

    const secondMessages = [
      ...messages,
      { role: 'assistant', content: null, tool_calls: firstMessage.tool_calls },
      {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: searchResult || 'No results found.'
      }
    ];

    const secondResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 700,
      temperature: 0.2,
      messages: secondMessages
    });

    return secondResponse.choices[0].message.content;
  }

  return firstMessage.content;
}

router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(Array.isArray(history) ? history.slice(-6) : []),
      { role: 'user', content: message }
    ];

    const reply = await runWithSearch(messages);
    res.json({ success: true, reply });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({
      success: false,
      reply: 'AI service temporarily unavailable. Please try again.'
    });
  }
});

module.exports = router;