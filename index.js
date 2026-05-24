const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { YoutubeTranscript } = require('youtube-transcript');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('YouTube Guide Bot is running!');
});

app.post('/guide', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'YouTube URL required' });
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url);
    const text = transcript.map(t => t.text).join(' ').slice(0, 4000);

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are an expert at extracting actionable knowledge from video transcripts. 
Given a transcript, create a clear step-by-step guide in JSON format only. 
Respond ONLY with valid JSON, no markdown, no backticks.
Format: {"title": "video topic", "steps": [{"number": 1, "title": "step title", "detail": "what to do"}]}
Maximum 8 steps. Make steps practical and actionable.`,
      messages: [{ role: 'user', content: `Extract a step-by-step guide from this transcript:\n\n${text}` }]
    }, {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    const content = response.data.content[0].text;
    const guide = JSON.parse(content);
    res.json(guide);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Failed to generate guide. Make sure video has captions.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
