import { expect, test } from "@playwright/test";

test("Northstar demo keeps RecruiterPal context, command navigation, and evidence workspace visible", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Sign in as Recruiting Lead/ }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("heading", { name: /Good to see you, Jordan/ })).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "RecruiterPal contextual execution pane" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Ask RecruiterPal" })).toBeVisible();
  await expect(page.locator("[data-pal-action=inspect-evidence]").first()).toBeEnabled();
  await expect(page.locator("[data-pal-action=ask-why]").first()).toBeEnabled();
  await expect(page.getByText(/human authority stays explicit/)).toBeVisible();

  await page.keyboard.press("Control+K");
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
  await page
    .getByRole("option", { name: /Open candidate workspace/ })
    .getByRole("button")
    .click();
  await expect(page).toHaveURL(/\/candidates$/);
  await expect(page.locator("[data-candidate-id]").first()).toBeVisible();

  await page.locator("[data-candidate-id]").first().getByRole("button").click();
  await expect(page.getByRole("dialog", { name: "Candidate workspace" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Evidence matrix" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Decision readiness" })).toBeVisible();
  await page.getByRole("button", { name: "Close candidate workspace" }).click();
  await expect(page.getByRole("dialog", { name: "Candidate workspace" })).toHaveCount(0);

  await page.locator("[data-candidate-id]").first().getByRole("button").click();
  await page
    .getByRole("dialog", { name: "Candidate workspace" })
    .getByRole("link", {
      name: /Ask RecruiterPal to explain/,
    })
    .click();
  await expect(page).toHaveURL(/\/today\?intent=readiness-review&candidate=.*&pal=/);
  await expect(page.getByRole("textbox", { name: "Ask RecruiterPal" })).toBeVisible();
});
