import os
import pathlib

import pytest
from selenium import webdriver

SCREENSHOTS = pathlib.Path(__file__).with_name("screenshots")


@pytest.fixture(scope="session")
def base_url():
    return os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")


@pytest.fixture(scope="session")
def driver():
    options = webdriver.ChromeOptions()
    if os.environ.get("E2E_HEADLESS", "1") != "0":
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,900")
    options.add_argument("--lang=uk")
    options.add_argument("--no-sandbox")  # контейнер/раннер CI
    # Selenium Manager сам знаходить або завантажує відповідний chromedriver
    drv = webdriver.Chrome(options=options)
    yield drv
    drv.quit()


@pytest.fixture
def shot(driver, request):
    """shot("назва") — знімок вікна браузера для звіту/артефактів CI."""
    SCREENSHOTS.mkdir(exist_ok=True)

    def take(name):
        driver.save_screenshot(str(SCREENSHOTS / f"{name}.png"))

    yield take
    # при падінні тесту — знімок стану сторінки
    if getattr(request.node, "rep_call", None) and request.node.rep_call.failed:
        take(f"FAILED-{request.node.name}")


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    setattr(item, f"rep_{rep.when}", rep)
