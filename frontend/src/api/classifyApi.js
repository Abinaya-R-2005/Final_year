import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

export const classifyText = async (text, compare = false) => {
    try {
        const response = await axios.post(`${API_URL}/predict`, { text, compare });
        return response.data;
    } catch (error) {
        console.error("Error classifying text:", error);
        throw error;
    }
};

export const extractPdfText = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_URL}/extract-pdf`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error("Error extracting PDF:", error);
        throw error;
    }
};

export const getHistory = async () => {
    const response = await axios.get(`${API_URL}/history`);
    return response.data;
};

export const getBenchmarking = async () => {
    const response = await axios.get(`${API_URL}/benchmarking`);
    return response.data;
};

export const getStatus = async () => {
    try {
        const response = await axios.get(`${API_URL}/status`);
        return response.data;
    } catch (error) {
        return { scibert: 'offline', bert: 'offline', gemini: 'offline', database: 'offline' };
    }
};

export const summarizeText = async (text, mode = 'plain') => {
    try {
        const response = await axios.post(`${API_URL}/summarize`, { text, mode });
        return response.data.summary;
    } catch (error) {
        console.error("Error summarizing text:", error);
        throw error;
    }
};

export const extractSections = async (text) => {
    try {
        const response = await axios.post(`${API_URL}/extract-sections`, { text });
        return response.data;
    } catch (error) {
        console.error("Error extracting sections:", error);
        throw error;
    }
};

export const chatWithPaper = async (text, question, full_text = null) => {
    try {
        const payload = { text, question };
        if (full_text) payload.full_text = full_text;
        const response = await axios.post(`${API_URL}/chat`, payload);
        return response.data.response;
    } catch (error) {
        console.error("Error in AI Chat:", error);
        throw error;
    }
};

export const generateLiteratureReview = async (texts) => {
    try {
        const response = await axios.post(`${API_URL}/literature-review`, { texts });
        return response.data;
    } catch (error) {
        console.error("Error generating literature review:", error);
        throw error;
    }
};
