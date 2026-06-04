const API_BASE = "/api";

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/`);
  if (!res.ok) throw new Error("Server unreachable");
  return res.json();
}

export async function sendMessage(message) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || "Request failed");
  }

  return data.reply;
}
