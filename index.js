const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Innertube } = require('youtubei.js'); // YouTubei.js library import ki

const app = express();
app.use(cors());
app.use(express.json());

// FRONTEND: HTML, CSS aur JavaScript code serve karne ke liye
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

// BACKEND: Video se transcript nikal kar Claude AI se guide generate karne ke liye
app.post('/guide', async (req, res) => {
  const { url, lang } = req.body;
  if (!url) return res.status(400).json({ error: 'YouTube URL required' });

  try {
    // 1. URL se Video ID nikalna (Regex jo har tarah ke links ko handle karega)
    const videoId = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([^&\n?#]+)/)?.[1];
    if (!videoId) throw new Error('Kripya ek valid YouTube URL enter karein.');

    const language = lang || 'English';

    // 2. YouTubei.js initialize karke video transcript fetch karna
    const youtube = await Innertube.create();
    let transcriptText = "";

    try {
      const videoInfo = await youtube.getInfo(videoId);
      const transcriptData = await videoInfo.getTranscript();
      
      if (transcriptData && transcriptData.transcript && transcriptData.transcript.snippets) {
      } catch (transcriptError) {
      console.error("Transcript Fetch Error:", transcriptError);
      
      // Selected language ke hisab se error message set karna
      let errorMsg = 'Is video me automatic captions ya subtitles nahi mil sake. Kripya koi dusri video try karein.'; // Default Hindi
      
      if (language === 'English') {
        errorMsg = 'Could not find automatic captions or subtitles for this video. Please try another video.';
      } else if (language === 'Spanish') {
        errorMsg = 'No se pudieron encontrar subtítulos para este video. Por favor, intenta con otro video.';
      } else if (language === 'French') {
        errorMsg = 'Impossible de trouver des sous-titres pour cette vidéo. Veuillez essayer une autre vidéo.';
      } else if (language === 'Urdu') {
        errorMsg = 'اس ویڈیو کے لیے سب ٹائٹلز نہیں مل سکے۔ براہ کرم کوئی دوسری ویڈیو ٹرائی کریں۔';
      } else if (language === 'Arabic') {
        errorMsg = 'لم يتم العثور على ترجمة مصاحبة لهذا الفيديو. يرجى محاولة فيديو آخر.';
      }

      throw new Error(errorMsg);
    }
      }
    } catch (transcriptError) {
      console.error("Transcript Fetch Error:", transcriptError);
      throw new Error('Is video me automatic captions ya subtitles nahi mil sake. Kripya koi dusri video try karein.');
    }

    // 3. Taiyar Transcript ko Claude AI API ko bhejna
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      system: `You are an expert at creating practical step-by-step guides from provided YouTube video transcripts. You MUST respond with ONLY a valid JSON object — no explanation, no markdown, no backticks. Pure JSON only. Format: {"title": "Guide title", "steps": [{"number": 1, "title": "Step title", "detail": "Step explanation"}]}`,
      messages: [{ 
        role: 'user', 
        content: `Create a detailed step-by-step guide in ${language} language based on this video transcript:\n\n${transcriptText}\n\nMake it practical, easy to follow, and give exactly 6-8 steps.` 
      }]
    }, {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    // 4. Claude ke response ko clean karke JSON parse karna
    const content = response.data.content[0].text;
    const clean = content.replace(/```json|```/g, '').trim();
    const guide = JSON.parse(clean);
    
    // Fronted ko final guide bhej dena
    res.json(guide);

  } catch (error) {
    console.error("Server Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
