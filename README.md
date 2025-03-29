# Publishing Reminder for Slack

An automated reminder system that sends daily notifications from Google Sheets to Slack about scheduled content publishing tasks. 
More importantly, this simple process can be easily generalized into any sort of GSheets -> Slack API integration you want to build!!
Get creative and have fun with it...

![Example Slack notification](<img width="639" alt="Screenshot 2025-03-29 at 12 22 03" src="https://github.com/user-attachments/assets/8293366e-2783-495b-a6ad-234e97582795" />)

## Features

- Daily notifications for content scheduled to be published
- Intelligent handling of weekends and Fridays
- Custom responses based on content status
- User tagging for accountability
- Weekend publishing detection and warnings
- Proper grammar for singular/plural items

## Prerequisites

- A Google account with access to Google Sheets and Google Apps Script
- A Slack Pro Plan (or higher) with admin permissions to create apps (Pro+ required for Slack API)

## Setup Instructions

### 1. Slack App Setup

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) and click "Create New App"
2. Choose "From scratch" and give your app a name (e.g., "Our Patient Publisher")
3. Select your workspace and click "Create App"
4. In the left sidebar, click "OAuth & Permissions"
5. Under "Bot Token Scopes", add the following scopes:
   - `chat:write` (to post messages)
   - `chat:write.public` (to post in public channels)
6. Scroll up and click "Install to Workspace"
7. After authorizing, copy the "Bot User OAuth Token" (starts with `xoxb-`)
8. Create or identify the channel where notifications should be posted
9. Add your bot to the channel by typing `/invite @YourBotName` in Slack

### 2. Google Sheet Setup

1. Create or open your content calendar Google Sheet. [Example file you can copy and edit]([url](https://docs.google.com/spreadsheets/d/1PBXld8ruF334NTaQR2CAVfS5vmKphp97GdweCcxoZ38/edit?gid=831832866#gid=831832866)).
3. Ensure your sheet has the following columns (names can be customized later in the script):
   - Publishing Date (formatted as dates)
   - Assigned Writer (the person responsible)
   - Idea Title (what's being published)
   - Channel Form (where it's being published)
   - Status (the current status of the content)

### 3. Google Apps Script Setup

1. In your Google Sheet, go to Extensions > Apps Script
2. Delete any code in the editor and paste the entire contents of `cal-reminder-in-slack.js`
3. Configure the timezone setting:
   - Click the gear icon (⚙️) in the left sidebar to open "Project Settings"
   - Find the "Time zone" setting and click "Edit"
   - Select whichever timezone you prefer
   - Click "Save"
4. Update the CONFIG object at the top with your settings:
   - Set the correct sheet name and column names
   - Paste your Slack Bot Token from step 1.7
   - Update the SLACK_CHANNEL with your channel ID
   - Set your spreadsheet URL
   - Adjust timing if needed (default: 12:00 PM)
5. Update the EMPLOYEE_SLACK_MAPPING object with your team members:
   - Get Slack user IDs by clicking on user profiles in Slack > "View full profile" > "..." menu > "Copy member ID"
   - Map both full names and nicknames to their corresponding IDs
6. Customize STATUS_RESPONSES if desired to match your workflow
7. Save the project with a descriptive name

### 4. Set Up the Trigger

1. Run the `setupTrigger` function:
   - In the function dropdown (above the editor), select "setupTrigger"
   - Click the Run button (play icon)
2. The first time you run it, you'll need to authorize permissions:
   - Click "Review Permissions" in the popup
   - Select your Google account
   - Click "Allow"
3. Verify the trigger is created:
   - Click the "Triggers" icon in the left sidebar (clock icon)
   - You should see a daily trigger for checkTodaysPublishing

### 5. Test the Integration

1. Add a test row to your spreadsheet with today's date
2. Run the test function:
   - Select "testCheckTodaysPublishing" from the function dropdown
   - Click the Run button
3. Check your Slack channel for the notification
4. Review the execution logs if needed:
   - Click "Executions" in the left sidebar

## Customization

- **Custom Messages**: Edit the STATUS_RESPONSES object to change the messages for different content statuses
- **Different Schedule**: Change TRIGGER_HOUR and TRIGGER_MINUTE in the CONFIG to run at a different time
- **Message Format**: Modify the sendConsolidatedNotification function to change the message format

## Troubleshooting

- **No notifications**: Verify the webhook URL and channel permissions
- **Missing users**: Update the EMPLOYEE_SLACK_MAPPING with all team members
- **Date issues**: Check that your spreadsheet is using actual date objects, not text
- **Script errors**: Check the Execution logs in the Apps Script editor

## License

MIT License - Feel free to modify and use for your own team!
