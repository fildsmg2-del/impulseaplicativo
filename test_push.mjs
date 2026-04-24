async function test() {
  try {
    const res = await fetch("https://mkyqzinteimagjerzfvz.supabase.co/functions/v1/push-notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1reXF6aW50ZWltYWdqZXJ6ZnZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MzQwNDksImV4cCI6MjA4MTIxMDA0OX0.5EK0gYw13sVqEMJZbsbKJsI6WCE8w3vau52VlO-uGuo"
      },
      body: JSON.stringify({
        type: "MANUAL",
        table: "manual",
        manual_data: {
          title: "Teste",
          message: "Teste debug",
          cargo: "ADMIN"
        }
      })
    });
    
    const text = await res.text();
    console.log("STATUS:", res.status);
    console.log("BODY:", text);
  } catch (err) {
    console.error(err);
  }
}

test();
