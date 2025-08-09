import asyncio
from pathlib import Path
from playwright.async_api import async_playwright, expect

async def run_verification():
    """
    This script performs an end-to-end test of the admin panel and main site.
    It logs in, creates a product, deletes it, and verifies the main catalog.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context()
        page = await context.new_page()

        # Add an initialization script to handle alerts.
        await page.add_init_script("window.alerts = []; window.confirms = [];")

        def handle_dialog(dialog):
            message = dialog.message
            if dialog.type == 'alert':
                print(f"ALERT: {message}")
                page.evaluate(f"window.alerts.push(`{message}`)")
            elif dialog.type == 'confirm':
                print(f"CONFIRM: {message}")
                page.evaluate(f"window.confirms.push(`{message}`)")
            dialog.accept()
        page.on("dialog", handle_dialog)

        project_root = Path(__file__).parent.parent.parent.resolve()

        try:
            # --- 1. Login to Admin Panel ---
            print("▶️ Starting test: Logging in...")
            admin_login_url = f'file://{project_root}/admin/index.html'
            await page.goto(admin_login_url)

            await page.get_by_label("Email").fill("zeleny_kontrakt@mail.ru")
            await page.get_by_label("Пароль").fill("i38X6r7RhQ.X9*X")
            await page.get_by_role("button", name="Войти").click()

            await page.wait_for_url(f"file://{project_root}/admin/dashboard.html", timeout=5000)
            await expect(page).to_have_title("Панель администратора - Дашборд")
            print("✅ Login successful.")

            # --- 2. Create a New Product ---
            print("\n▶️ Testing Product Creation...")
            await page.get_by_role("link", name="Каталог").click()
            await page.wait_for_url(f"file://{project_root}/admin/catalog.html")

            await page.get_by_role("button", name="Добавить товар").click()

            add_modal = page.locator("#addProductModal")
            await add_modal.wait_for(state="visible")

            # Use specific locators with exact=True to avoid ambiguity
            await add_modal.get_by_label("Название", exact=True).fill("Тестовая Ель")
            await add_modal.get_by_label("Латинское название").fill("Picea Testus")
            await add_modal.get_by_label("Тип").select_option("хвойные")
            await add_modal.get_by_label("В наличии").check()

            await add_modal.get_by_role("button", name="Сохранить").click()

            await page.wait_for_function("window.alerts.some(msg => msg.includes('Товар успешно добавлен'))")
            print("✅ Product creation successful.")

            # --- 3. Delete the Product ---
            print("\n▶️ Testing Product Deletion...")
            product_row = page.get_by_role("row", name="Тестовая Ель")
            await expect(product_row).to_be_visible()

            await product_row.get_by_role("button", name="Удалить").click()

            await page.wait_for_function("window.alerts.some(msg => msg.includes('Товар успешно удален'))")
            await expect(product_row).not_to_be_visible()
            print("✅ Product deletion successful.")

            # --- 4. Verify Main Site Catalog ---
            print("\n▶️ Testing Main Site Catalog...")
            main_site_url = f'file://{project_root}/index.html'
            await page.goto(main_site_url)

            await page.get_by_role("button", name="🌲 Каталог").click()

            catalog_grid = page.locator("#catalog-grid")
            await expect(catalog_grid.locator(".tree-card").first).to_be_visible(timeout=10000)
            print("✅ Main site catalog loaded successfully.")

            # --- 5. Take Final Screenshot ---
            screenshot_path = "jules-scratch/verification/verification.png"
            await page.screenshot(path=screenshot_path, full_page=True)
            print(f"📸 Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"\n❌ Test failed: {e}")
            error_screenshot_path = "jules-scratch/verification/error.png"
            await page.screenshot(path=error_screenshot_path, full_page=True)
            print(f"📸 Error screenshot saved to {error_screenshot_path}")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run_verification())
