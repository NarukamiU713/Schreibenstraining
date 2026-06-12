async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "foo", teil: 1 })
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
  } catch (err: any) {
    console.log("Error:", err.message);
  }
}
run();

