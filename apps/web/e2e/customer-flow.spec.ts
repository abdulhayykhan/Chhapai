import { test, expect } from "@playwright/test";

test.describe("Customer Mobile Printing Flow (M4 Acceptance)", () => {
  test("completes landing to token page on mobile viewport and updates status upon operator approval", async ({
    page,
  }) => {
    let jobStatus = "PENDING_APPROVAL";

    // 1. Mock API calls
    await page.route("**/api/v1/public/shops/main-branch", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          name: "Chhapai Main Branch",
          isOpen: true,
          rates: {
            rateBwSingle: 5,
            rateBwDouble: 4,
            rateColorSingle: 30,
            rateColorDouble: 25,
          },
          maxFileMb: 25,
          maxPages: 200,
          acceptedTypes: ["PDF", "DOCX", "JPG"],
        }),
      });
    });

    await page.route(
      "**/api/v1/public/shops/main-branch/uploads",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            uploadId: "upload-uuid-1",
            fileName: "assignment.pdf",
            pageCount: 5,
            sizeBytes: 2048,
          }),
        });
      },
    );

    await page.route("**/api/v1/public/quote", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          pagesPerCopy: 5,
          printedPages: 5,
          unitRate: 5,
          total: 25,
        }),
      });
    });

    await page.route("**/api/v1/public/jobs", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          publicToken: "sampletoken1234567890123",
          tokenLabel: "#047",
          status: "PENDING_APPROVAL",
          total: 25,
        }),
      });
    });

    await page.route(
      "**/api/v1/public/jobs/sampletoken1234567890123",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            tokenLabel: "#047",
            status: jobStatus,
            total: 25,
            paymentStatus: "UNPAID",
            shopName: "Chhapai Main Branch",
            createdAt: new Date().toISOString(),
          }),
        });
      },
    );

    // 2. Visit shop landing page on mobile viewport
    await page.goto("/s/main-branch");

    // Verify shop name and open status
    await expect(page.locator("h1")).toContainText("Chhapai Main Branch");
    await expect(page.locator("text=Khula Hai")).toBeVisible();

    // 3. Upload file via hidden file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "assignment.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 test file"),
    });

    // 4. Verify uploaded chip appears
    await expect(page.locator("text=assignment.pdf")).toBeVisible();
    await expect(page.locator("text=5 Pages")).toBeVisible();

    // 5. Fill customer name
    const nameInput = page.locator(
      'input[placeholder="Apna poora naam likhein"]',
    );
    await nameInput.fill("Zubair Khan");

    // 6. Verify quote in bottom sticky bar
    await expect(page.locator("text=Rs. 25")).toBeVisible();

    // 7. Submit Job
    const submitButton = page.locator('button:has-text("Submit Karein")');
    await submitButton.click();

    // 8. Verify redirected to token page /j/sampletoken1234567890123
    await page.waitForURL("**/j/sampletoken1234567890123");

    // 9. Verify Token #047 and initial pending status
    await expect(page.locator("text=#047").first()).toBeVisible();
    await expect(page.locator("text=Approval Ka Intezar Hai")).toBeVisible();
    await expect(page.locator("text=Order Cancel Karein")).toBeVisible();

    // 10. Simulate operator approval in background
    jobStatus = "APPROVED";

    // 11. Verify status automatically updates on next 3s poll
    await expect(page.locator("text=Job Approve Ho Gaya Hai")).toBeVisible({
      timeout: 6000,
    });
  });
});
