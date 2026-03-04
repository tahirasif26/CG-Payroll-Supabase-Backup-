

## Smart Expense Auto-Scan Feature

This plan adds an "Auto Scan" button next to "New Claim" on the Expenses page. Since no backend/AI service is connected, the extraction will be **simulated with realistic mock data** to prototype the full UI flow. This can be upgraded to real AI extraction (via Lovable Cloud + Gemini vision) later.

### Architecture

The flow: Upload receipt → Simulated extraction → Editable review form → Submit as expense claim.

### Changes

**1. New Component: `src/components/expenses/AutoScanDialog.tsx`**

- Multi-step dialog triggered by the "Auto Scan" button
- **Step 1 — Upload**: File input accepting images (JPG/PNG) and PDFs. Shows a drop zone with drag-and-drop support. Displays file preview (image thumbnail or PDF icon).
- **Step 2 — Processing**: Brief loading animation (1.5s simulated delay) with a scanning indicator to give the feel of real OCR processing.
- **Step 3 — Review & Edit**: Displays extracted fields in an editable form:
  - Employee (select from employee list)
  - Amount (numeric input)
  - Currency (select from system currencies)
  - Date (date picker)
  - Category (select from expense categories — matched from extracted text)
  - Description (textarea, pre-filled from extracted vendor/item info)
  - Optional: Confidence score badge per field (High/Medium/Low) shown next to each extracted value
- User can modify any field before submitting
- Submit creates the expense claim using the existing `handleSubmit` logic

**2. Mock Extraction Logic (inside AutoScanDialog)**

- A function `simulateExtraction()` that returns realistic extracted data after a delay:
  - Randomly selects from a small set of mock receipt templates (restaurant, taxi, office supplies, training)
  - Returns `{ amount, currency, date, category, description, confidence }` per field
  - Maps extracted category to closest system expense category using simple keyword matching
  - Normalizes date to system format, currency to ISO code

**3. Update: `src/pages/ExpensesPage.tsx`**

- Import `AutoScanDialog` component
- Add "Auto Scan" button with a `ScanLine` icon next to the existing "New Claim" button
- Wire dialog open state and pass `onSubmit` callback that adds the scanned expense to the list (reuses existing expense creation logic)

### UI Details

- The "Auto Scan" button uses an outline/secondary variant to differentiate from the primary "New Claim" button
- The upload drop zone has a dashed border with an upload icon
- Processing step shows a pulsing scan animation
- Review form highlights AI-extracted fields with subtle colored borders and confidence indicators
- Fields that couldn't be extracted are left blank with a "Not detected" placeholder

### Future Upgrade Path

When ready for real extraction, enable Lovable Cloud, create an edge function that sends the uploaded image to Gemini vision API, and swap out `simulateExtraction()` for a real API call. The review UI remains unchanged.

