import asyncio
from playwright.async_api import async_playwright

async def main():
    print("🚀 Launching simple test...")
    async with async_playwright() as p:
        print("   - Launching browser...")
        browser = await p.chromium.launch()
        print("   - Browser launched.")
        page = await browser.new_page()
        print("   - Navigating to Google.com...")
        await page.goto("http://www.google.com")
        print(f"   - Page title: {await page.title()}")
        screenshot_path = "jules-scratch/verification/simple_test.png"
        await page.screenshot(path=screenshot_path)
        print(f"📸 Screenshot saved to {screenshot_path}")
        await browser.close()
        print("✅ Simple test complete.")

if __name__ == "__main__":
    asyncio.run(main())
