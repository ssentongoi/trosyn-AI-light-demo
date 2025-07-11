import { Request, Response, NextFunction } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../config/config';

export const saveContent = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `document_${timestamp}.json`;
        const documentsDir = config.documentsDir;
        const filePath = path.join(documentsDir, filename);
        
        // Ensure the documents directory exists
        await fs.mkdir(documentsDir, { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');

        return res.status(200).json({ 
            success: true, 
            message: 'Document saved successfully',
            filename
        });
    } catch (error) {
        next(error);
    }
};

export const exportContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { content, format = 'txt' } = req.body;
        
        if (!content) {
            res.status(400).json({ error: 'Content is required' });
            return;
        }

        let exportData = '';
        let contentType = 'text/plain';
        
        switch (format) {
            case 'txt':
                exportData = convertToText(content);
                break;
            case 'html':
                exportData = convertToHtml(content);
                contentType = 'text/html';
                break;
            case 'json':
                exportData = JSON.stringify(content, null, 2);
                contentType = 'application/json';
                break;
            default:
                res.status(400).json({ error: 'Unsupported export format' });
                return;
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename=export.${format}`);
        res.send(exportData);
    } catch (error) {
        next(error);
    }
};

// Helper functions
function convertToText(content: any): string {
    if (!content.blocks || !Array.isArray(content.blocks)) {
        return JSON.stringify(content, null, 2);
    }

    return content.blocks.map((block: any) => {
        switch (block.type) {
            case 'header':
                return `${'#'.repeat(block.data.level || 1)} ${block.data.text}`;
            case 'paragraph':
                return block.data.text;
            case 'list':
                return block.data.items.map((item: string) => `- ${item}`).join('\n');
            default:
                return `[${block.type} block]`;
        }
    }).join('\n\n');
}

function convertToHtml(content: any): string {
    if (!content.blocks || !Array.isArray(content.blocks)) {
        return `<html><body><pre>${JSON.stringify(content, null, 2)}</pre></body></html>`;
    }

    const blocksHtml = content.blocks.map((block: any) => {
        switch (block.type) {
            case 'header':
                return `<h${block.data.level || 1}>${block.data.text}</h${block.data.level || 1}>`;
            case 'paragraph':
                return `<p>${block.data.text}</p>`;
            case 'list':
                const items = block.data.items.map((item: string) => `  <li>${item}</li>`).join('\n');
                return `<ul>\n${items}\n</ul>`;
            default:
                return `<!-- ${block.type} block -->`;
        }
    }).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Exported Document</title>
</head>
<body>
${blocksHtml}
</body>
</html>`;
}
