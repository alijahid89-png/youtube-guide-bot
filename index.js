const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
<title>YouTube Guide Bot</title>
<style>
body{font-family:Arial,sans-serif;max-width:700px;margin:50px auto;padding:20px}
h1{color:#ff0000}
input{width:100%;padding:12px;font-size:16px;margin:10px 0;border:1px solid #ddd;border-radius:8px}
button{background:#ff0000;color:white;padding:12px 30px;font-size:16px;border:none;border-radius:8px;cursor:pointer}
button:hover{background:#cc0000}
#output{margin-top:30px;padding:20px;background:#f9f9f9;border-radius:8px;display:none}
.step{background:white;margin:10px 0;padding:15px;border-radius:8px;border-left:4px solid #ff0000}
.step-num{color:#ff0000;font-weight:bold}
</style>
</head>
<body>
<h1>YouTube Video Guide Bot</h1>
<p>YouTube link paste karo — AI step-by-step guide banayega</p>
<input type="text" id="url" placeholder="https://www.youtube.com/watch?v=..." />
<button onclick="getGuide()">Guide Banao</button>
<div id="output"></div>
<script>
async function getGuide(){
  const url=document.getElementById('url').value.trim();
  const out=document.getElementById('output');
  if(!url){out.style.display='block';out.innerHTML='<p>URL daalo pehle!</p>';return;}
  out.style.display='block';
  out.innerHTML='<p>Guide ban rahi hai... thoda wait karo...</p>';
  try{
    const res=await fetch('/guide',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
    const data=await res.json();
    if(data.error){out.innerHTML='<p style="color:red">'+data.error+'</p>';return;}
    let html='<h2>'+data.title+'</h2>';
    data.steps.forEach(s=>{html+='<div class="step"><span class="step-num">Step '+s.number+': '+s.title+'</span><p>'+s.detail+'</p></div>';});
    out.innerHTML=html;
  }catch(e){out.innerHTML='<p style="color:red">Error: '+e.message+'</p>';}
}
</script>
</body>
</html>`);
});

app.post('/guide', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'YouTube URL required' });

  try {
    const videoId = url.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
    if (!videoId) throw new Error('Invalid YouTube URL');

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are an expert at creating step-by-step guides. Given a YouTube video URL, create a practical step-by-step guide. You MUST respond with ONLY a valid JSON object. No explanation, no markdown, no backticks. Just pure JSON in this exact format: {"title": "Guide title here", "steps": [{"number": 1, "title": "Step title", "detail": "Step detail here"}]}`,
      messages: [{ role: 'user', content: `Create a step-by-step guide for this YouTube video: ${url}` }]
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
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
