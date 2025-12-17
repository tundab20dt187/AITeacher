import type { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';

type Data = {
    slides?: Array<{ slideIndex: number; slideId: string; text: string; notes: string }>;
    error?: string;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { presentationId } = req.body;

    if (!presentationId) {
        return res.status(400).json({ error: 'Presentation ID required' });
    }

    console.log('📥 Received presentation ID:', presentationId);

    try {
        // Log environment variables for debugging
        console.log('📋 Google Auth Config:', {
            project_id: process.env.GOOGLE_PROJECT_ID,
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            has_private_key: !!process.env.GOOGLE_PRIVATE_KEY,
        });

        // Initialize the Slides API
        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
        
        const slides = google.slides({
            version: 'v1',
            auth: new google.auth.GoogleAuth({
                credentials: {
                    type: 'service_account',
                    project_id: process.env.GOOGLE_PROJECT_ID,
                    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
                    private_key: privateKey,
                    client_email: process.env.GOOGLE_CLIENT_EMAIL,
                    client_id: process.env.GOOGLE_CLIENT_ID,
                },
                scopes: ['https://www.googleapis.com/auth/presentations.readonly'],
            }),
        });

        // Get presentation details
        const presentation = await slides.presentations.get({
            presentationId,
        });

        // Extract text and notes from each slide
        const slideTexts: Array<{ slideIndex: number; slideId: string; text: string; notes: string }> = [];

        presentation.data.slides?.forEach((slide, index) => {
            let slideText = '';
            let slideNotes = '';
            
            // Extract slide content
            slide.pageElements?.forEach((element: any) => {
                // Extract from shape text
                if (element.shape?.text?.textElements) {
                    element.shape.text.textElements.forEach((textElement: any) => {
                        if (textElement.textRun?.content) {
                            slideText += textElement.textRun.content;
                        }
                    });
                }
                // Extract from textBox
                if (element.textBox?.text?.textElements) {
                    element.textBox.text.textElements.forEach((textElement: any) => {
                        if (textElement.textRun?.content) {
                            slideText += textElement.textRun.content;
                        }
                    });
                }
                // Extract from table
                if (element.table?.tableRows) {
                    element.table.tableRows.forEach((row: any) => {
                        row.tableCells?.forEach((cell: any) => {
                            if (cell.text?.textElements) {
                                cell.text.textElements.forEach((textElement: any) => {
                                    if (textElement.textRun?.content) {
                                        slideText += textElement.textRun.content + ' ';
                                    }
                                });
                            }
                        });
                    });
                }
            });

            // Extract speaker notes
            if (slide.slideProperties?.notesPage) {
                const notesPage = slide.slideProperties.notesPage;
                notesPage.pageElements?.forEach((element: any) => {
                    if (element.shape?.text?.textElements) {
                        element.shape.text.textElements.forEach((textElement: any) => {
                            if (textElement.textRun?.content) {
                                slideNotes += textElement.textRun.content;
                            }
                        });
                    }
                });
            }

            slideTexts.push({
                slideIndex: index,
                slideId: slide.objectId || `slide_${index}`, // Get actual slide ID
                text: slideText.trim() || `Slide ${index + 1}`,
                notes: slideNotes.trim() || '',
            });
        });

        console.log('Extracted slides:', slideTexts);
        res.status(200).json({ slides: slideTexts });
    } catch (error: any) {
        console.error('❌ Error fetching slides:', {
            message: error.message,
            code: error.code,
            status: error.status,
            details: error.details || error.toString(),
        });
        res.status(500).json({ 
            error: `Failed to fetch slides: ${error.message || 'Unknown error'}` 
        });
    }
}
