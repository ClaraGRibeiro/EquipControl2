const mysql = require('mysql2');

// MariaDB publicado pelo Docker na porta 3306 do host.
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'otmg123',
  database: process.env.DB_NAME || 'equip_control',
  port: Number(process.env.DB_PORT || 3306),
});

connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar no MariaDB:', err.message);
    return;
  }
  console.log('Conectado ao banco equip_control.');
});

module.exports = connection;
