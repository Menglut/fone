import dotenv from 'dotenv';
import app from './app.js';   // ✅ 여기서 우리가 만든 app을 가져옴

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
