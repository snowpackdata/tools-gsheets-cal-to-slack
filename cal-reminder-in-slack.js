/**
 * Daily Content Publisher Notification Script
 * sends reminders to Slack about content scheduled for publishing
 * orrrrrrrrr anything else you can generalize from this process!
 */

// Configuration (Update these values to your specific gsheet's values)
const CONFIG = {
  // Google Sheet settings
  SHEET_NAME: "Content Ideas",
  DATE_COLUMN: "Publishing Date",
  
  // Required columns for the notification
  ASSIGNED_WRITER_COLUMN: "Assigned Writer",
  IDEA_TITLE_COLUMN: "Idea Title",
  CHANNEL_FORM_COLUMN: "Channel Form",
  STATUS_COLUMN: "Status",
  
  // Slack OAuth token (from your Slack app settings for "Bot User OAuth Token")
  SLACK_BOT_TOKEN: "xoxb-YOUR-TOKEN-HERE",
  
  // Channel to post to (can be a channel ID or name like "#content")
  SLACK_CHANNEL: "C0123456789", // Replace with your channel ID
  
  // Bot name and icon (shown in Slack)
  BOT_ICON: ":alarm_clock:", // have fun with it!
  
  // Optional: Spreadsheet URL to link in the message (for the footer)
  SPREADSHEET_URL: "https://docs.google.com/spreadsheets/d/YOUR-SHEET-ID/edit",
  
  // Trigger time (12:00 CET)
  // time zone for GApps script setting in Apps Script settings
  TRIGGER_HOUR: 12,
  TRIGGER_MINUTE: 0
};

// Map team members to their Slack IDs
const EMPLOYEE_SLACK_MAPPING = {
  // Full names - update with your team members
  // We recommend you lock with "Dropdown" values the names used in the GSheet so you can't make mistakes
  "Team Member 1": "Uexample1",
  "Team Member 2": "Uexample2",
};

// Status response mapping with emojis based on day (today vs tomorrow)
const STATUS_RESPONSES = {
  "today": {
    "Backlog": "Oops! Do you need to reschedule? :grimace:",
    "Blocked": "Uh oh... can you unblock this in time? :x:",
    "Assigned": "Please prioritize this today! :runner:",
    "In Progress": "Almost there... :muscle:",
    "Scheduled Already": "Niceee. Homework complete! :white_check_mark:",
    "Published": "You're :fire: and ahead of schedule! :white_check_mark:",
  },
  "tomorrow": {
    "Backlog": "Please work on this today :pencil:",
    "Blocked": "Uh oh... can you unblock this in time? :x:",
    "Assigned": "Please start working on this soon. :nerd_face:",
    "In Progress": "Way to work ahead! :muscle:",
    "Scheduled Already": "Niceee. Homework complete early! :white_check_mark:",
    "Published": "You're :fire: and ahead of schedule! :white_check_mark:",
  }
};

/**
 * Gets the status-specific response message based on day
 */
function getStatusResponse(status, isToday) {
  const dayKey = isToday ? "today" : "tomorrow";
  const dayResponses = STATUS_RESPONSES[dayKey] || STATUS_RESPONSES["today"];
  return dayResponses[status] || dayResponses["DEFAULT"];
}

/**
 * Checks if a date is a weekend (Saturday or Sunday)
 */
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Main function that checks for today's and tomorrow's publishing items
 * and sends a consolidated Slack notification
 */
function checkTodaysPublishing() {
  try {
    // Check if today is a weekday (1-5, Monday-Friday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Exit if it's a weekend (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log("Today is a weekend. Skipping notification.");
      return;
    }
    
    // Reset the time to midnight for date comparisons
    today.setHours(0, 0, 0, 0);
    
    // Get the sheet data
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
      console.error(`Sheet "${CONFIG.SHEET_NAME}" not found.`);
      return;
    }
    
    // Get all data including headers
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      console.log("Sheet is empty or only contains headers.");
      return;
    }
    
    // Extract headers to find column indices
    const headers = data[0];
    const dateColIndex = headers.indexOf(CONFIG.DATE_COLUMN);
    const writerColIndex = headers.indexOf(CONFIG.ASSIGNED_WRITER_COLUMN);
    const titleColIndex = headers.indexOf(CONFIG.IDEA_TITLE_COLUMN);
    const channelFormColIndex = headers.indexOf(CONFIG.CHANNEL_FORM_COLUMN);
    const statusColIndex = headers.indexOf(CONFIG.STATUS_COLUMN);
    
    // Check if required columns exist
    const requiredColumns = [
      {name: CONFIG.DATE_COLUMN, index: dateColIndex},
      {name: CONFIG.ASSIGNED_WRITER_COLUMN, index: writerColIndex},
      {name: CONFIG.IDEA_TITLE_COLUMN, index: titleColIndex},
      {name: CONFIG.CHANNEL_FORM_COLUMN, index: channelFormColIndex},
      {name: CONFIG.STATUS_COLUMN, index: statusColIndex}
    ];
    
    const missingColumns = requiredColumns.filter(col => col.index === -1);
    if (missingColumns.length > 0) {
      console.error(`Missing required columns: ${missingColumns.map(col => col.name).join(", ")}`);
      return;
    }
    
    // Get tomorrow's date
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Arrays to store today's, tomorrow's, and weekend items
    const todayItems = [];
    const tomorrowItems = [];
    const weekendItems = [];
    
    // Process each row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const publishDate = row[dateColIndex];
      
      // Skip empty cells or non-date values
      if (!publishDate || !(publishDate instanceof Date)) {
        continue;
      }
      
      // Normalize date to midnight for comparison
      const normalizedDate = new Date(publishDate);
      normalizedDate.setHours(0, 0, 0, 0);
      
      // Get status, use "??" if blank/empty
      let status = row[statusColIndex];
      if (!status || status.toString().trim() === "") {
        status = "??";
      }
      
      // Get channel form, use "??" if blank/empty
      let channelForm = row[channelFormColIndex];
      if (!channelForm || channelForm.toString().trim() === "") {
        channelForm = "??";
      }
      
      // Create content item object
      const item = {
        writer: row[writerColIndex],
        title: row[titleColIndex],
        channelForm: channelForm,
        status: status,
        date: normalizedDate
      };
      
      // Check if date matches today or tomorrow
      if (normalizedDate.getTime() === today.getTime()) {
        todayItems.push(item);
      } else if (normalizedDate.getTime() === tomorrow.getTime()) {
        tomorrowItems.push(item);
        
        // If tomorrow is a weekend, also count it as a weekend item
        if (isWeekend(tomorrow)) {
          weekendItems.push(item);
        }
      } else if (isWeekend(normalizedDate)) {
        // Collect items scheduled for any other weekend (not tomorrow)
        weekendItems.push(item);
      }
    }
    
    // Send consolidated notification with all collected items
    sendConsolidatedNotification(todayItems, tomorrowItems, weekendItems, dayOfWeek);
    
    // Log summary
    console.log(`Found ${todayItems.length} items for today, ${tomorrowItems.length} items for tomorrow, and ${weekendItems.length} items scheduled on weekends.`);
    
  } catch (error) {
    console.error("Error in checkTodaysPublishing: " + error.toString());
  }
}

/**
 * Sends a consolidated Slack notification for today's and tomorrow's items
 */
function sendConsolidatedNotification(todayItems, tomorrowItems, weekendItems, dayOfWeek) {
  try {
    // Count of today's and tomorrow's items
    const todayCount = todayItems.length;
    const tomorrowCount = tomorrowItems.length;
    const weekendCount = weekendItems.length;
    const isFriday = dayOfWeek === 5; // Check if today is Friday
    
    // If no items found for either day, show default message
    if (todayCount === 0 && tomorrowCount === 0 && weekendCount === 0) {
      const defaultText = "Good morning writers! We have no publishing tasks scheduled for today nor tomorrow... Let's start brainstorming NOW! :coffee:";
      
      // Create Block Kit message for empty calendar
      const blocks = [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": defaultText
          }
        },
        {
          "type": "divider"
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `See <${CONFIG.SPREADSHEET_URL}|Publishing Gsheet> for all details.`
          }
        }
      ];
      
      // Send the message
      sendSlackBlockMessage(blocks);
      return;
    }
    
    // Format post counts with proper pluralization
    let todayText = "";
    if (todayCount === 0) {
      todayText = "Today we need new ideas!";
    } else if (todayCount === 1) {
      todayText = `Today we are publishing *${todayCount}* post.`;
    } else {
      todayText = `Today we are publishing *${todayCount}* posts.`;
    }
    
    // Format tomorrow section based on whether it's Friday
    let tomorrowText = "";
    if (isFriday) {
      tomorrowText = "And enjoy the weekend tomorrow";
    } else if (tomorrowCount === 0) {
      tomorrowText = "And we need ideas for tomorrow";
    } else if (tomorrowCount === 1) {
      tomorrowText = `And we are preparing *${tomorrowCount}* post for tomorrow:`;
    } else {
      tomorrowText = `And we are preparing *${tomorrowCount}* posts for tomorrow:`;
    }
    
    // Start building the message blocks
    const blocks = [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `*Good morning writers!* ${todayText} ${tomorrowText}`
        }
      },
      {
        "type": "divider"
      }
    ];
    
    // Add today's items
    blocks.push({
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Today*"
      }
    });
    
    if (todayCount > 0) {
      // Add each of today's items as bullet points
      todayItems.forEach(item => {
        const slackUserId = EMPLOYEE_SLACK_MAPPING[item.writer];
        if (!slackUserId) {
          console.warn(`No Slack ID found for writer: ${item.writer}`);
        }
        
        const mention = slackUserId ? `<@${slackUserId}>` : item.writer;
        const statusResponse = getStatusResponse(item.status, true); // true = today
        
        blocks.push({
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `• ${mention}, your \`${item.title}\` is _${item.status}_. ${statusResponse}`
          }
        });
      });
    } else {
      // Add message when no items for today
      blocks.push({
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "Yikes, team! <!channel>: We need content ASAP for today. Who can take the lead? :wave:"
        }
      });
    }
    
    // Add divider between sections
    blocks.push({
      "type": "divider"
    });
    
    // Add tomorrow's items
    blocks.push({
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Tomorrow*"
      }
    });
    
    // Special handling for Friday
    if (isFriday) {
      if (weekendCount > 0) {
        // If it's Friday AND there are weekend posts, show mountain emoji with weekend warning
        blocks.push({
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `:snow_capped_mountain: ... except first we need to reschedule ${weekendCount} post${weekendCount === 1 ? '' : 's'} from the weekend to later next week. Who can own that? :pray:`
          }
        });
      } else {
        // If it's Friday with no weekend posts, just show mountain emoji
        blocks.push({
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": ":snow_capped_mountain:"
          }
        });
      }
    } else if (tomorrowCount > 0) {
      // Not Friday - Add each of tomorrow's items as bullet points
      tomorrowItems.forEach(item => {
        const slackUserId = EMPLOYEE_SLACK_MAPPING[item.writer];
        if (!slackUserId) {
          console.warn(`No Slack ID found for writer: ${item.writer}`);
        }
        
        const mention = slackUserId ? `<@${slackUserId}>` : item.writer;
        const statusResponse = getStatusResponse(item.status, false); // false = tomorrow
        
        blocks.push({
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `• ${mention}, please prepare \`${item.title}\` (currently _${item.status}_) for publishing tomorrow. ${statusResponse}`
          }
        });
      });
      
      // Add weekend warning after tomorrow items if needed (when it's not Friday)
      if (weekendCount > 0) {
        blocks.push({
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `Also, we need to reschedule ${weekendCount} post${weekendCount === 1 ? '' : 's'} from the weekend to next week. Who can own that? :pray:`
          }
        });
      }
    } else {
      // No tomorrow items and not Friday
      if (weekendCount > 0) {
        blocks.push({
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `We need to reschedule ${weekendCount} post${weekendCount === 1 ? '' : 's'} from the weekend to next week. Who can own that? :pray:`
          }
        });
      } else {
        // No tomorrow items, not Friday, no weekend items
        blocks.push({
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "Yikes, team! <!channel>: We need more content planned for tomorrow. What can you think of? :thinking_face:"
          }
        });
      }
    }
    
    // Add a final divider before the footer
    blocks.push({
      "type": "divider"
    });
    
    // Add footer
    blocks.push({
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `See <${CONFIG.SPREADSHEET_URL}|Publishing Gsheet> for all details.`
      }
    });
    
    // Send the message
    sendSlackBlockMessage(blocks);
    
  } catch (error) {
    console.error(`Error sending consolidated notification: ${error.toString()}`);
  }
}

/**
 * Helper function to send a Block Kit message to Slack
 */
function sendSlackBlockMessage(blocks) {
  // API request payload
  const payload = {
    "channel": CONFIG.SLACK_CHANNEL,
    "blocks": blocks
  };
  
  // Make the API request
  const options = {
    "method": "post",
    "contentType": "application/json",
    "headers": {
      "Authorization": `Bearer ${CONFIG.SLACK_BOT_TOKEN}`
    },
    "payload": JSON.stringify(payload)
  };
  
  const response = UrlFetchApp.fetch("https://slack.com/api/chat.postMessage", options);
  const responseData = JSON.parse(response.getContentText());
  
  if (responseData.ok) {
    console.log("Consolidated notification sent successfully");
  } else {
    console.error(`Error sending message to Slack: ${responseData.error}`);
  }
}

/**
 * Creates a daily trigger to run the script at the specified time
 * Run this function once to set up the automation
 */
function setupTrigger() {
  // Delete any existing triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === "checkTodaysPublishing") {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  
  // Create a new daily trigger at the specified time
  ScriptApp.newTrigger("checkTodaysPublishing")
    .timeBased()
    .atHour(CONFIG.TRIGGER_HOUR)
    .nearMinute(CONFIG.TRIGGER_MINUTE)
    .everyDays(1)
    .create();
  
  console.log(`Daily trigger set up to run at ${CONFIG.TRIGGER_HOUR}:${CONFIG.TRIGGER_MINUTE.toString().padStart(2, "0")} in the script's timezone`);
}

/**
 * Manual test function to check today's items
 * Run this function to test the script without waiting for the trigger
 */
function testCheckTodaysPublishing() {
  checkTodaysPublishing();
}
