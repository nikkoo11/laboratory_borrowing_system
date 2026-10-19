# Demo Script: Equipment and Notification Updates

**Estimated time:** 3–5 minutes  
**Demo setup:** Start the backend and frontend using the instructions in the [README](./README.md). Use two browser windows or profiles: one signed in as an admin/staff member and one signed in as a student. Have at least one equipment category available.

## 1. Add equipment

**Presenter:** “I’ll start by adding a piece of equipment to the laboratory inventory.”

**Action:** In the admin window, open **Inventory** and select **Add equipment**. Enter a demo name, location, category, and quantity, then select **Save equipment**.

**Expected result:** After a successful save, the add-equipment panel closes, the form resets, and the new item appears in the inventory list.

**Presenter:** “The item is now in the inventory, and the add form closes automatically after the save succeeds.”

## 2. Trigger an incoming notification

**Action:** Leave the admin window signed in with the notification bell loaded. In the student window, open the equipment catalog and submit a borrowing request for the demo item.

**Presenter:** “When a student submits a borrowing request, the lab team receives a notification.”

**Expected result:** Within the next notification refresh (up to 30 seconds), the admin/staff window plays the notification ringtone and shows an unread count on the bell. Select the bell to view the new request.

**Presenter:** “The notification arrives with a sound and an unread indicator. Selecting it marks it as read and opens the related transaction.”

## Demo notes

- Keep the admin/staff session open before submitting the student request. The initial notification load establishes a baseline and does not play sounds for older notifications.
- Make sure the browser tab is not muted and the system volume is audible. Browser audio settings or autoplay restrictions may prevent sound playback.
- Borrow requests use available equipment and create a pending request; this demo does not require approving the request.
