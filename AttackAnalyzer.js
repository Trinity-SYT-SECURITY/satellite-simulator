import { GoogleGenAI } from "@google/genai";
import config from './config';

export default class AttackAnalyzer {
  constructor() {
    this.aiClient = null;
    this.initAI();
  }

  initAI() {
    try {
      if (config.googleAI?.apiKey) {
        this.aiClient = new GoogleGenAI({ 
          apiKey: config.googleAI.apiKey 
        });
        console.log("AI client initialized successfully");
      } else {
        console.warn("No Google AI API key configured");
      }
    } catch (error) {
      console.error("Failed to initialize AI client:", error);
    }
  }

  async analyzeAttack(event) {
    if (!this.aiClient) {
      return {
        analysis: "AI analysis unavailable (missing API key)",
        recommendations: ["Check your Google AI API configuration"]
      };
    }

    try {
      const prompt = `As a satellite communications security expert, analyze this attack:
      
**Target Satellite**
- Name: ${event.target.name}
- NORAD ID: ${event.target.satrec?.satnum || 'unknown'}
- Frequency: ${(event.frequency / 1e6).toFixed(2)} MHz

**Attack Details**  
- Type: ${this.getAttackTypeName(event.type)}
- Power: ${event.intensity} dBm
- Distance: ${(event.range / 1000).toFixed(1)} km
- Duration: ${event.duration}ms

Provide:
1. Technical impact assessment (1-5 severity)
2. Recommended countermeasures
3. Likely attacker capabilities
4. Signal propagation analysis`;

      const response = await this.aiClient.models.generateContent({
        model: config.googleAI?.model || "gemini-2.0-flash",
        contents: prompt,
        safetySettings: {
          category: "HARM_CATEGORY_DANGEROUS",
          threshold: "BLOCK_NONE"
        }
      });

      return {
        analysis: response.text,
        recommendations: this.extractRecommendations(response.text),
        severity: this.extractSeverity(response.text)
      };
    } catch (error) {
      console.error("AI analysis failed:", error);
      return {
        analysis: `AI analysis error: ${error.message}`,
        recommendations: ["Retry analysis later"]
      };
    }
  }

  getAttackTypeName(type) {
    const types = {
      power: "Power Jamming",
      frequency: "Frequency Interference",
      spoofing: "Signal Spoofing",
      dos: "Denial of Service"
    };
    return types[type] || type;
  }

  extractRecommendations(text) {
    // 簡單提取建議的邏輯
    const recs = [];
    if (text.includes("frequency hopping")) recs.push("Implement frequency hopping");
    if (text.includes("directional antenna")) recs.push("Use directional antennas");
    if (text.includes("encryption")) recs.push("Enable signal encryption");
    return recs.length > 0 ? recs : ["See analysis for recommendations"];
  }

  extractSeverity(text) {
    if (text.match(/severity[\s:]*[1-5]/i)) {
      return parseInt(text.match(/severity[\s:]*([1-5])/i)[1]);
    }
    return 3; // 默認中等嚴重性
  }
}
