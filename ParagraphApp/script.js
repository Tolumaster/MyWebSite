const noteInput = document.getElementById("noteInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const clearBtn = document.getElementById("clearBtn");

const imageInput = document.getElementById("imageInput");
const ocrBtn = document.getElementById("ocrBtn");
const fileName = document.getElementById("fileName");

const outputCards = document.getElementById("outputCards");

const OPENROUTER_API_KEY = "BURAYA_KEY";

function setDefaultOutput(message = "Henüz bir işlem yapılmadı.") {
  outputCards.innerHTML = `
    <div class="result-card">
      <h3>Durum</h3>
      <p>${message}</p>
    </div>
  `;
}

function createCard(title, content, isList = false) {
  if (!content || content.trim() === "") return "";

  if (isList) {
    const items = content
      .split("\n")
      .map(item => item.replace(/^- /, "").trim())
      .filter(Boolean)
      .map(item => `<li>${item}</li>`)
      .join("");

    return `
      <div class="result-card">
        <h3>${title}</h3>
        <ul>${items}</ul>
      </div>
    `;
  }

  return `
    <div class="result-card">
      <h3>${title}</h3>
      <p>${content}</p>
    </div>
  `;
}

function renderAnalysis(text) {
  const sections = {
    "Başlık": "",
    "Konu": "",
    "Ana Fikir": "",
    "Yardımcı Düşünceler": "",
    "Kısa Özet": "",
    "Yorum": "",
    "Soru Çözüm İpucu": ""
  };

  let currentKey = null;
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    if (sections.hasOwnProperty(trimmed.replace(":", "")) && trimmed.endsWith(":")) {
      currentKey = trimmed.replace(":", "");
      continue;
    }

    if (currentKey) {
      sections[currentKey] += (sections[currentKey] ? "\n" : "") + trimmed;
    }
  }

  outputCards.innerHTML = `
    ${createCard("Başlık", sections["Başlık"])}
    ${createCard("Konu", sections["Konu"])}
    ${createCard("Ana Fikir", sections["Ana Fikir"])}
    ${createCard("Yardımcı Düşünceler", sections["Yardımcı Düşünceler"], true)}
    ${createCard("Kısa Özet", sections["Kısa Özet"])}
    ${createCard("Yorum", sections["Yorum"])}
    ${createCard("Soru Çözüm İpucu", sections["Soru Çözüm İpucu"])}
  `;
}

async function askAI(prompt) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-3-super-120b-a12b:free",
      messages: [
        {
          role: "system",
          content:
            "Sen Türkçe paragraf analiz eden bir asistansın. Cevaplarının tamamı yalnızca Türkçe olmalı. Metinden cümle kopyalama yapma. Alıntı yapma. OCR kaynaklı bozuk kelimeleri anlamına göre düzelt. Anlamsız veya uydurma kelime üretme."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("API hatası: " + errorText);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

analyzeBtn.addEventListener("click", async function () {
  const text = noteInput.value.trim();

  if (!text) {
    setDefaultOutput("Lütfen önce bir paragraf gir.");
    return;
  }

  setDefaultOutput("Paragraf analiz ediliyor...");

  try {
    const result = await askAI(`
Aşağıdaki paragrafı analiz et.

ZORUNLU KURALLAR:
- Cevabın tamamı sadece Türkçe olsun.
- Yabancı dilde hiçbir kelime kullanma.
- Metinden cümleleri aynen kopyalama.
- Alıntı yapma.
- Kendi cümlelerinle yaz.
- Eğer metinde OCR kaynaklı bozuk kelimeler varsa anlamına göre düzelt.
- Açıklamalar sade, net ve öğretici olsun.

Şu formatta yaz:

Başlık:
...

Konu:
...

Ana Fikir:
...

Yardımcı Düşünceler:
- ...
- ...

Kısa Özet:
...

Yorum:
...

Soru Çözüm İpucu:
...

Paragraf:
${text}
    `);

    renderAnalysis(result);
  } catch (error) {
    setDefaultOutput("Bir hata oluştu: " + error.message);
  }
});

imageInput.addEventListener("change", function () {
  if (imageInput.files.length > 0) {
    fileName.textContent = imageInput.files[0].name;
  } else {
    fileName.textContent = "Henüz dosya seçilmedi";
  }
});

ocrBtn.addEventListener("click", async function () {
  const file = imageInput.files[0];

  if (!file) {
    setDefaultOutput("Lütfen önce bir fotoğraf seç.");
    return;
  }

  setDefaultOutput("Fotoğraftaki yazı okunuyor...");

  try {
    const worker = await Tesseract.createWorker("tur+eng");
    const {
      data: { text }
    } = await worker.recognize(file);

    await worker.terminate();

    if (!text.trim()) {
      setDefaultOutput("Fotoğraftan okunabilir bir metin çıkarılamadı.");
      return;
    }

    noteInput.value = text.trim();
    setDefaultOutput("Fotoğraftaki yazı başarıyla metin alanına aktarıldı.");
  } catch (error) {
    setDefaultOutput("OCR sırasında bir hata oluştu: " + error.message);
  }
});

clearBtn.addEventListener("click", function () {
  noteInput.value = "";
  imageInput.value = "";
  fileName.textContent = "Henüz dosya seçilmedi";
  setDefaultOutput();
});

setDefaultOutput();