import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path));

    const response = await axios.post('http://localhost:8000/analyze', formData, {
      headers: formData.getHeaders(),
    });

    fs.unlinkSync(req.file.path);  // Clean up

    res.json(response.data);  // Return results to frontend
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Model analysis failed' });
  }
});

export default router;
