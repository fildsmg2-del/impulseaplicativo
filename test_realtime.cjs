const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://mkyqzinteimagjerzfvz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1reXF6aW50ZWltYWdqZXJ6ZnZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MzQwNDksImV4cCI6MjA4MTIxMDA0OX0.5EK0gYw13sVqEMJZbsbKJsI6WCE8w3vau52VlO-uGuo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const name = '🪄 MÁGICA REALTIME ' + new Date().toLocaleTimeString();
  console.log('Inserindo cliente:', name);
  const { data, error } = await supabase.from('clients').insert([
    { 
      name, 
      document: '000.000.000-00', 
      document_type: 'CPF', 
      email: 'teste@realtime.com'
    }
  ]);
  if (error) {
    console.error('Erro:', error);
    process.exit(1);
  } else {
    console.log('Sucesso! Verifique sua tela de Clientes.');
    process.exit(0);
  }
}

test();
