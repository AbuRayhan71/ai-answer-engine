import { NextResponse } from "next/server";
import GroqClient from "groq-sdk";
import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, urls } = body;

    // Validate message input
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // Helper function to validate URLs
    const isValidUrl = (url: string): boolean => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    // Validate URLs
    if (urls && !Array.isArray(urls)) {
      return NextResponse.json({ error: "URLs must be an array." }, { status: 400 });
    }

    const invalidUrls = urls?.filter((url: string) => !isValidUrl(url)) || [];
    if (invalidUrls.length > 0) {
      return NextResponse.json(
        { error: `Invalid URLs: ${invalidUrls.join(", ")}` },
        { status: 400 }
      );
    }

    // Initialize Groq AI client
    const client = new GroqClient({
      apiKey: "your-api-key", // Replace with your actual API key
    });

    const scrapedData: { url: string; staticContent: string; dynamicContent: string }[] = [];

    // Scrape data from URLs if provided
    if (urls?.length > 0) {
      for (const url of urls) {
        try {
          // Cheerio: Fetch and parse static content
          const { data } = await axios.get(url);
          const $ = cheerio.load(data);
          const staticContent = $("h1").text().trim() || "No static content found.";

          // Puppeteer: Fetch dynamic content
          const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
          });
          const page = await browser.newPage();
          await page.goto(url, { waitUntil: "networkidle2" });
          const dynamicContent = await page.evaluate(() => {
            const element = document.querySelector("h1");
            return element ? element.innerText.trim() : "No dynamic content found.";
          });
          await browser.close();

          scrapedData.push({ url, staticContent, dynamicContent });
        } catch (scrapingError) {
          console.error(`Error scraping URL: ${url}`, scrapingError);
          scrapedData.push({
            url,
            staticContent: "Failed to fetch static content.",
            dynamicContent: "Failed to fetch dynamic content.",
          });
        }
      }
    }

    // Prepare sources text for AI prompt
    const sourcesText = scrapedData
      .map(
        (source, index) =>
          `Source ${index + 1}: ${source.url}\nStatic Content: "${source.staticContent}"\nDynamic Content: "${source.dynamicContent}"`
      )
      .join("\n\n");

    // Query Groq AI for a response
    let aiResponse = "";
    try {
      const response = await client.chat.completions.create({
        messages: [
          { role: "system", content: "You are a helpful assistant that give link to the sites that you use to give answers" },
          {
            role: "user",
            content: `${message}\n\nConsider the following sources:\n\n${sourcesText}`,
          },
        ],
        model: "llama3-8b-8192", // Ensure correct model name
      });
      aiResponse = response.choices[0]?.message?.content ?? "No response from AI.";
    } catch (err) {
      console.error("Error with Groq API:", err);
      return NextResponse.json({ error: "Failed to fetch AI response." }, { status: 500 });
    }

    // Return AI response and citations
    return NextResponse.json(
      {
        success: true,
        aiResponse,
        citations: scrapedData.map((source) => ({
          url: source.url,
          content: `${source.staticContent} / ${source.dynamicContent}`,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
