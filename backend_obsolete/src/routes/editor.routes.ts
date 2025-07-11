import { Router } from 'express';
import { saveContent, exportContent } from '../controllers/editor.controller';

const router = Router();

/**
 * @route   POST /api/editor/save
 * @desc    Save editor content to a file
 * @access  Public
 */
router.post('/save', saveContent);

/**
 * @route   POST /api/editor/export
 * @desc    Export content to a file (txt, html, json)
 * @access  Public
 */
router.post('/export', exportContent);

// Export the router as the default export
export default router;
