import { Router } from 'express';
import { createPdfBuffer } from '../services/pdf.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { title = '자기소개서', content } = req.body;
    const pdfBuffer = await createPdfBuffer(title, content);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=coverletter.pdf'
    );
    res.send(pdfBuffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'pdf_failed' });
  }
});

export default router;
