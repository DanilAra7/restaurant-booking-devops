"""E2E-тести веб-інтерфейсу бронювання (Selenium WebDriver + pytest).

Тести працюють із розгорнутим застосунком так само, як користувач: відкривають
сторінку в Chrome, заповнюють форму, натискають кнопки й перевіряють те, що
видно на екрані. Запити йдуть через Nginx до booking-service і PostgreSQL.

    docker compose up -d --build --wait
    pip install -r tests/e2e/requirements.txt
    pytest tests/e2e                      # E2E_BASE_URL=http://localhost:8080
    E2E_HEADLESS=0 pytest tests/e2e       # з видимим вікном браузера

Знімки екрана кожного кроку зберігаються в tests/e2e/screenshots/.
"""
import random

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait


def unique_phone():
    return f"+38067{random.randint(1000000, 9999999)}"


def future_date():
    # випадкова дата в майбутньому: повторні запуски на тій самій базі не конфліктують
    return f"{random.randint(2031, 2039)}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}"


class BookingPage:
    """Page Object: селектори сторінки зібрано в одному місці."""

    def __init__(self, driver, base_url, shot):
        self.driver, self.base_url, self.shot = driver, base_url, shot
        self.wait = WebDriverWait(driver, 10)

    def open(self):
        self.driver.get(self.base_url + "/")
        # список ресторанів завантажується з API після відкриття сторінки
        self.wait.until(lambda d: len(Select(d.find_element(By.ID, "restaurant")).options) > 0)
        return self

    def restaurants(self):
        return [o.text for o in Select(self.driver.find_element(By.ID, "restaurant")).options]

    def fill(self, restaurant_id, date, time, guests, name, phone):
        form = self.driver.find_element(By.ID, "booking-form")
        Select(form.find_element(By.NAME, "restaurantId")).select_by_value(str(restaurant_id))
        # поля date/time заповнюються через value: формат введення з клавіатури залежить від мови браузера
        for field, value in (("date", date), ("time", time)):
            el = form.find_element(By.NAME, field)
            self.driver.execute_script("arguments[0].value = arguments[1]", el, value)
        for field, value in (("guests", guests), ("name", name), ("phone", phone)):
            el = form.find_element(By.NAME, field)
            el.clear()
            el.send_keys(str(value))
        return self

    def click_check(self):
        self.driver.find_element(By.ID, "check").click()

    def submit(self):
        self.driver.find_element(By.CSS_SELECTOR, "#booking-form button[type=submit]").click()

    def message(self, contains):
        self.wait.until(EC.text_to_be_present_in_element((By.ID, "message"), contains))
        el = self.driver.find_element(By.ID, "message")
        return el.text, el.get_attribute("class")

    def history(self):
        # список перемальовується повністю (replaceChildren), тож елементи, знайдені
        # find_elements, можуть «застаріти» до читання тексту; JS читає список атомарно
        return self.driver.execute_script(
            "return [...document.querySelectorAll('#bookings li')]"
            ".map((li) => (li.querySelector('span') || li).textContent)")


@pytest.fixture
def page(driver, base_url, shot):
    return BookingPage(driver, base_url, shot).open()


def test_page_shows_restaurants_from_api(page):
    names = page.restaurants()
    assert len(names) >= 2
    assert any("Під Липою" in n for n in names)
    page.shot("01-page-loaded")


def test_booking_flow_check_book_history_cancel(page):
    phone, date = unique_phone(), future_date()
    page.fill(1, date, "19:00", 2, "Selenium Тест", phone)

    page.click_check()
    text, cls = page.message("Є вільні столики")
    assert cls == "ok"
    page.shot("02-availability")

    page.submit()
    text, cls = page.message("підтверджено")
    assert cls == "ok" and date in text and "19:00" in text
    # після бронювання сторінка сама показує історію за цим телефоном
    page.wait.until(lambda d: any(date in item for item in page.history()))
    page.shot("03-booked-history")

    page.driver.find_element(By.CSS_SELECTOR, "#bookings li button").click()
    page.wait.until(lambda d: page.history() == ["Бронювань немає"])
    page.shot("04-cancelled")


def test_client_side_validation_blocks_bad_phone(page):
    page.fill(1, future_date(), "19:00", 2, "Іван", "12345")
    page.submit()
    text, cls = page.message("Некоректний номер телефону")
    assert cls == "error"
    page.shot("05-validation-error")


def test_second_booking_of_the_only_big_table_is_rejected(page):
    date = future_date()
    page.fill(2, date, "19:00", 8, "Компанія", unique_phone()).submit()
    page.message("підтверджено")
    page.fill(2, date, "20:00", 8, "Інша компанія", unique_phone()).submit()
    text, cls = page.message("немає вільних столиків")
    assert cls == "error"
    page.shot("06-conflict")
