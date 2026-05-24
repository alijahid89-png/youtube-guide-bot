const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// FRONTEND CODE
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>YouTube Guide Bot</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;background:#f9f9f9;min-height:100vh}
.header{background:#ff0000;padding:20px;text-align:center;color:white}
.header h1{font-size:28px;font-weight:700}
.header p{font-size:14px;opacity:0.9;margin-top:5px}
.container{max-width:750px;margin:40px auto;padding:20px}
.card{background:white;border-radius:16px;padding:30px;box-shadow:0 2px 12px rgba(0,0,0,0.08)}
.input-group{margin-bottom:16px}
.input-group label{display:block;font-size:13px;font-weight:600;color:#555;margin-bottom:6px}
.input-group input,.input-group select{width:100%;padding:14px;font-size:15px;border:1.5px solid #e0e0e0;border-radius:10px;outline:none;transition:border 0.2s}
.input-group input:focus,.input-group select:focus{border-color:#ff0000}
.btn{width:100%;background:#ff0000;color:white;padding:14px;font-size:16px;font-weight:600;border:none;border-radius:10px;cursor:pointer;transition:background 0.2s;margin-top:8px}
.btn:hover{background:#cc0000}
.btn:disabled{background:#ffaaaa;cursor:not-allowed}
#output{margin-top:28px;display:none}
.guide-title{font-size:20px;font-weight:700;color:#222;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #ff0000}
.step{background:#fff;border:1px solid #f0f0f0;border-left:4px solid #ff0000;border-radius:8px;padding:16px;margin-bottom:12px}
.step-header{font-weight:700;color:#ff0000;font-size:14px;margin-bottom:6px}
.step-detail{color:#444;font-size:15px;line-height:1.6}
.loading{text-align:center;padding:30px;color:#888}
.loading-spinner{width:40px;height:40px;border:4px solid #f0f0f0;border-top:4px solid #ff0000;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px}
@keyframes spin{to{transform:rotate(360deg)}}
.error{background:#fff5f5;border:1px solid #ffcccc;border-radius:8px;padding:16px;color:#cc0000;font-size:14px}
.footer{text-align:center;margin-top:30px;color:#aaa;font-size:12px}
</style>
</head>
<body>
<div class="header">
  <h1>▶ YouTube Guide Bot</h1>
  <p>Paste any YouTube link — get an instant step-by-step guide</p>
</div>
<div class="container">
  <div class="card">
    <div class="input-group">
      <label>YouTube Video URL</label>
      <input type="text" id="url" placeholder="https://www.youtube.com/watch?v=..." />
    </div>
    <div class="input-group">
      <label>Guide Language</label>
      <select id="lang">
        <option value="English">English</option>
        <option value="Hindi">Hindi (हिंदी)</option>
        <option value="Urdu">Urdu (اردو)</option>
        <option value="Spanish">Spanish (Español)</option>
        <option value="Arabic">Arabic (العربية)</option>
        <option value="French">French (Français)</option>
      </select>
    </div>
    <button class="btn" id="btn" onclick="getGuide()">Generate Guide ▶</button>
  </div>
  <div id="output"></div>
  <div class="footer">Powered by Claude AI • Free to use</div>
</div>
<script>
async function getGuide(){
  const url=document.getElementById('url').value.trim();
  const lang=document.getElementById('lang').value;
  const out=document.getElementById('output');
  const btn=document.getElementById('btn');
  if(!url){out.style.display='block';out.innerHTML='<div class="error">Please enter a YouTube URL first.</div>';return;}
  btn.disabled=true;
  btn.textContent='Generating...';
  out.style.display='block';
  out.innerHTML='<div class="loading"><div class="loading-spinner"></div><p>Creating your guide in '+lang+'...</p></div>';
  try{
    const res=await fetch('/guide',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url,lang})});
    const data=await res.json();
    if(data.error){out.innerHTML='<div class="error">'+data.error+'</div>';return;}
    let html='<div class="guide-title">'+data.title+'</div>';
    data.steps.forEach(s=>{html+='<div class="step"><div class="step-header">Step '+s.number+': '+s.title+'</div><div class="step-detail">'+s.detail+'</div></div>';});
    out.innerHTML=html;
  }catch(e){out.innerHTML='<div class="error">Something went wrong. Please try again.</div>';}
  finally{btn.disabled=false;btn.textContent='Generate Guide ▶';}
}
document.getElementById('url').addEventListener('keypress',function(e){if(e.key==='Enter')getGuide();});
</script>
</body>
</html>`);
});

// BACKEND: Video ID extract karne ka naya full-proof tareeqa
app.post('/guide', async (req, res) => {
  let { url, lang } = req.body;
  if (!url) return res.status(400).json({ error: 'YouTube URL required' });

  const language = lang || 'English';

  try {
    // URL se clean video ID nikalne ka sabse robust naya tarika
    let videoId = "";
    try {
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('youtube.com/embed/')[1].split(/[?#]/)[0];
      } else if (url.includes('youtube.com/shorts/')) {
        videoId = url.split('youtube.com/shorts/')[1].split(/[?#]/)[0];
      } else if (url.includes('v=')) {
        videoId = url.split('v=')[1].split('&')[0].split(/[?#]/)[0];
      } else {
        // Fallback regex agar upar waale miss ho jayein
        const match = url.match(/(?:v=|shorts\/|embed\/|youtu\.be\/)([^&\n?#]+)/);
        videoId = match ? match[1] : "";
      }
    } catch (err) {
      console.error("ID Extraction failed", err);
    }

    // Safai ke liye kisi bhi bache hue kachre ko saaf karna
    videoId = videoId.trim();

    if (!videoId || videoId.length !== 11) {
      throw new Error(language === 'English' ? 'Please enter a valid, clean YouTube URL.' : 'Kripya ek saaf aur valid YouTube URL enter karein.');
    }

    console.log("Fetching data for Video ID:", videoId);

    let videoTitle = "";
    let videoDescription = "";

    // YouTube API calling
    try {
      const youtubeResponse = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
        params: {
          part: 'snippet',
          id: videoId,
          key: process.env.YOUTUBE_API_KEY
        }
      });

      if (youtubeResponse.data && youtubeResponse.data.items && youtubeResponse.data.items.length > 0) {
        const snippet = youtubeResponse.data.items[0].snippet;
        videoTitle = snippet.title;
        videoDescription = snippet.description;
      } else {
        throw new Error("Video not found on YouTube with this ID");
      }
    } catch (apiError) {
      console.error("YouTube API Backend Error:", apiError.response ? apiError.response.data : apiError.message);
      throw new Error(language === 'English' ? 'Failed to fetch video details from YouTube API.' : 'YouTube API se video ki details nahi mil saki.');
    }

    // Claude AI API integration
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      system: `You are an expert at creating practical step-by-step guides based on a YouTube video's title and description. You MUST respond with ONLY a valid JSON object — no explanation, no markdown, no backticks. Pure JSON only. Format: {"title": "Guide title", "steps": [{"number": 1, "title": "Step title", "detail": "Step explanation"}]}`,
      messages: [{ 
        role: 'user', 
        content: `Create a detailed step-by-step guide in ${language} language based on this YouTube video data:\nVideo Title: ${videoTitle}\nVideo Description: ${videoDescription}\n\nMake it practical, fill in the logical cooking/tutorial steps if the description is short, and give exactly 6-8 steps.` 
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
    console.error("Main Server Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
