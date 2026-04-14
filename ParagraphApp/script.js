const noteInput = document.getElementById("noteInput");
const output = document.getElementById("output");

const analyzeBtn = document.getElementById("analyzeBtn");
const clearBtn = document.getElementById("clearBtn");

const imageInput = document.getElementById("imageInput");
const ocrBtn = document.getElementById("ocrBtn");
const fileName = document.getElementById("fileName");

const OPENROUTER_API_KEY = "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";

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
    output.textContent = "Lütfen önce bir paragraf gir.";
    return;
  }

  output.textContent = "Paragraf analiz ediliyor...";

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

    output.textContent = result;
  } catch (error) {
    output.textContent = "Bir hata oluştu:\n" + error.message;
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
    output.textContent = "Lütfen önce bir fotoğraf seç.";
    return;
  }

  output.textContent = "Fotoğraftaki yazı okunuyor...";

  try {
    const worker = await Tesseract.createWorker("tur+eng");
    const {
      data: { text }
    } = await worker.recognize(file);

    await worker.terminate();

    if (!text.trim()) {
      output.textContent = "Fotoğraftan okunabilir bir metin çıkarılamadı.";
      return;
    }

    noteInput.value = text.trim();
    output.textContent = "Fotoğraftaki yazı başarıyla metin alanına aktarıldı.";
  } catch (error) {
    output.textContent = "OCR sırasında bir hata oluştu:\n" + error.message;
  }
});

clearBtn.addEventListener("click", function () {
  noteInput.value = "";
  imageInput.value = "";
  fileName.textContent = "Henüz dosya seçilmedi";
  output.textContent = "Henüz bir işlem yapılmadı.";
});