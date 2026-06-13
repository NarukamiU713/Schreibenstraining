const p = "Dies ist ein Satz. Und noch ein Satz! Und eine Frage? Ja...";
const parts = p.split(/([.?!]+[\s\n]+(?=[A-ZÄÖÜ]))/);

const sentences = [];
for (let i = 0; i < parts.length; i += 2) {
  const text = parts[i];
  const delim = parts[i + 1] || "";
  sentences.push(text + delim);
}
console.log(sentences);
