const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { YoutubeTranscript } = require('youtube-transcript'); // 1. Library import ki

const app = express();
app.use(cors());
app.use(express.json());

// ... (Aapka app.get('/') wala frontend code bilkul sahi hai, use waisa hi rehne dein) ...

app.post('/guide', async (req, res) => {
  const { url, lang } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    let videoDataForAI = "";
    const language = lang || 'English';

    // 2. Check karein ki URL YouTube ka hai ya kisi aur platform ka
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      
      // YouTube Video ID nikalne ka behtar Regex
      const videoId = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([^&\n?#]+)/)?.[1];
      if (!videoId) throw new Error('Valid YouTube URL nahi mila.');

      try {
        // YouTube se subtitles/transcript fetch karein
        const transcriptObj = await YoutubeTranscript.fetchTranscript(videoId);
        videoDataForAI = transcriptObj.map(t => t.text).join(' ');
      } catch (transcriptError) {
        // Fallback: Agar video me subtitles block hain ya nahi hain
        throw new Error('Is video ki transcript nahi nikal saki. Kripya aisi video try karein jisme subtitles/captions ho.');
      }

    } else if (url.includes('instagram.com') || url.includes('facebook.com')) {
      // Instagram aur FB ko bina scrapers ke padhna mushkil hai
      // Filhal AI ko link bhej rahe hain, par behtar hoga agar aap baad me koi RapidAPI use karein
      videoDataForAI = `Platform: Social Media Link. URL: ${url}. (Note: Directly fetch nahi ho saka, context ke hisab se guide banayein)`;
      throw new Error('Instagram aur Facebook videos ke liye advanced scraper chahiye. Filhal sirf YouTube supported hai.');
    } else {
      throw new Error('Sirf YouTube, Instagram aur Facebook links hi supported hain.');
    }

    // 3. Claude API ko poori transcript bhejein guide banane ke liye
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-5-sonnet-20241022', // Tip: Sonnet ka updated model version use karein
      max_tokens: 1500,
      system: `You are an expert at creating practical step-by-step guides from provided video transcripts. 
      You MUST respond with ONLY a valid JSON object — no explanation, no markdown, no backticks. Pure JSON only. 
      Format: {"title": "Guide title", "steps": [{"number": 1, "title": "Step title", "detail": "Step explanation"}]}`,
      messages: [{ 
        role: 'user', 
        content: `Create a detailed step-by-step guide in ${language} language based on this video transcript:\n\n${videoDataForAI}\n\nMake it practical and easy to follow. Give exactly 6-8 steps.` 
      }]
    }, {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    const content = response.data.content[0].text;
    const clean = content.replace(/```json|```/g, '').trim();
    const guide = JSON.parse(clean);
    res.json(guide);

  } catch (error) {
    console.error("Error occurred:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
