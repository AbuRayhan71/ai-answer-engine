import { NextResponse } from 'next/server';
import GroqClient from 'groq-sdk';
import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, url } = body;

    // Validate the message input
    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
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

    // Validate the URL input
    if (url && !isValidUrl(url)) {
      return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 });
    }

    // Initialize Groq AI client
    const client = new GroqClient({
      apiKey: process.env.GROQ_API_KEY || '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', // Use environment variable for security
    });

    // Query Groq AI with the provided message
    let aiResponse = '';
    try {
      const response = await client.chat.completions.create({
        messages: [{ role: 'user', content: message }],
        model: 'llama3-8b-8192', // Replace with the correct model
      });
      aiResponse = response.choices[0].message.content ?? '';
    } catch (err) {
      console.error('Error with Groq API:', err);
      return NextResponse.json({ error: 'Failed to fetch AI response.' }, { status: 500 });
    }

    // Variables to store scraped content
    let scrapedText = '';
    let dynamicContent = '';

    // Scrape content from the provided URL (if any)
    if (url) {
      try {
        // Cheerio: Scrape static content
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        scrapedText = $('h1').text() || 'No static content found.';

        // Puppeteer: Scrape dynamic content
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'], // Ensure Puppeteer works in restricted environments
        });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });
        dynamicContent = await page.evaluate(() => {
          const element = document.querySelector('h1');
          return element ? element.innerText : 'No dynamic content found.';
        });
        await browser.close();
      } catch (scrapingError) {
        console.error('Error during scraping:', scrapingError);
        return NextResponse.json(
          { error: 'Failed to scrape content from the URL.' },
          { status: 500 }
        );
      }
    }

    // Return the response
    return NextResponse.json(
      {
        success: true,
        aiResponse,
        scraping: {
          staticContent: scrapedText,
          dynamicContent: dynamicContent,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
