// --- script.js ---

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements for text and controls
    const generateBtn = document.getElementById('generate-btn');
    const userInput = document.getElementById('userInput');
    const featureSelect = document.getElementById('feature-select');
    const languageSelect = document.getElementById('language-select');
    const outputDiv = document.getElementById('output');
    const loader = document.getElementById('loader');
    const copyBtn = document.getElementById('copy-btn');
    const placeholder = document.querySelector('.placeholder-text');

    // DOM Elements for Image Upload
    const imageUpload = document.getElementById('image-upload');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');

    // --- Configuration ---
    const apiKey = 'AIzaSyD-iGGEytWJSgAycuqAKDME-DjACm6j3pM';
    // We use gemini-1.5-flash because it's fast and supports multimodal (text + image) input
    const modelName = 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}&alt=sse`;

    // Variables to store uploaded image data
    let uploadedImageBase64 = null;
    let uploadedImageType = null;

    // --- Image Handling Logic ---

    // When a user selects a file
    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreviewContainer.style.display = 'block';
                // Store the Base64 data (without the "data:image/jpeg;base64," part)
                uploadedImageBase64 = e.target.result.split(',')[1];
                uploadedImageType = file.type;
            };
            // Read the file as a Data URL, which gives us a Base64 string
            reader.readAsDataURL(file);
        }
    });

    // When the user clicks the 'x' button to remove the image
    removeImageBtn.addEventListener('click', () => {
        imageUpload.value = ''; // Reset the file input
        imagePreviewContainer.style.display = 'none';
        imagePreview.src = '#';
        uploadedImageBase64 = null;
        uploadedImageType = null;
    });

    // --- Main Generate Button Logic ---
    generateBtn.addEventListener('click', async () => {
        const inputText = userInput.value.trim();
        const feature = featureSelect.value;
        const language = languageSelect.value;

        // Check if there is any input (either text or an image)
        if (!inputText && !uploadedImageBase64) {
            outputDiv.innerHTML = '<p class="placeholder-text">Please enter text or upload an image first.</p>';
            return;
        }

        // Show loading animation and clear previous output
        loader.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
        outputDiv.innerHTML = '';
        outputDiv.style.display = 'block';

        let promptText;
        // Construct the text part of the prompt based on the selected feature
        switch (feature) {
            case 'ask-question':
                promptText = `Answer the following question. If an image is provided, use it as context for your answer. Question: ${inputText}`;
                break;
            case 'mathematics':
                promptText = `You are a math expert. Solve the following math problem. If an image is provided, solve the problem shown in the image. Explain the steps clearly. Problem: ${inputText}`;
                break;
            case 'paragraph-writer':
                promptText = `Write a well-structured and detailed paragraph on the following topic. If an image is provided, describe the image or use it as inspiration for the paragraph. Topic: ${inputText}`;
                break;
            case 'grammar-help':
                promptText = `You are an English grammar teacher. Analyze and correct the following text, explaining the grammatical mistakes and suggesting improvements: "${inputText}"`;
                break;
            case 'make-notes':
                promptText = `Generate detailed, well-structured study notes on the topic: ${inputText}`;
                break;
            case 'explain-concept':
                promptText = `Explain the following concept in a simple and easy-to-understand way: ${inputText}`;
                break;
            case 'create-quiz':
                promptText = `Create a short quiz with 5 multiple-choice questions and answers on the topic of: ${inputText}`;
                break;
            case 'study-routine':
                promptText = `Create a personalized one-week study routine for these subjects: ${inputText}`;
                break;
            case 'fix-writing':
                promptText = `Correct the grammar and improve the writing of the following text: "${inputText}"`;
                break;
            case 'translate-simplify':
                promptText = `Simplify the following text for a 10th-grade student: "${inputText}"`;
                break;
            case 'summarize':
                promptText = `Summarize the following text in about 100 words: "${inputText}"`;
                break;
            default:
                promptText = inputText;
        }
        
        // Add language instruction to the prompt
        promptText += `\n\nPlease provide the response in ${language}. Use proper Markdown formatting.`;

        // --- Construct the API Request Body ---
        let requestBody;
        const contents = [{ parts: [] }];

        // Add the text part to the request
        contents[0].parts.push({ text: promptText });

        // If an image is uploaded, add it to the request
        if (uploadedImageBase64 && uploadedImageType) {
            contents[0].parts.push({
                inline_data: {
                    mime_type: uploadedImageType,
                    data: uploadedImageBase64
                }
            });
        }
        
        requestBody = { contents };

        // --- API Fetch Logic ---
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(`API request failed with status ${response.status}: ${errorBody.error.message}`);
            }

            loader.style.display = 'none';

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = '';
            let fullMarkdownResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                accumulatedText += decoder.decode(value, { stream: true });
                const lines = accumulatedText.split('\n');
                accumulatedText = lines.pop();

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonString = line.substring(6);
                        try {
                            const chunk = JSON.parse(jsonString);
                            if (chunk.candidates && chunk.candidates[0].content.parts[0].text) {
                                const textPart = chunk.candidates[0].content.parts[0].text;
                                fullMarkdownResponse += textPart;
                                outputDiv.innerHTML = marked.parse(fullMarkdownResponse);
                            }
                        } catch (e) {
                            // Ignore JSON parsing errors
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Fetch Error:', error);
            loader.style.display = 'none';
            outputDiv.innerHTML = `<p style="color: red;">An error occurred: ${error.message}.</p>`;
        }
    });

    // --- Copy Button Logic ---
    copyBtn.addEventListener('click', () => {
        const textToCopy = outputDiv.innerText;
        if (textToCopy && textToCopy !== "Your generated response will appear here...") {
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = '📋 Copy';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
    });
});