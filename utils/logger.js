import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const logsDir = path.join(__dirname, '..', 'logs');
const errorLogFile = path.join(logsDir, 'errors.log');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function formatLog(type, message, error = null) {
  const timestamp = new Date().toISOString();
  let logEntry = `[${timestamp}] [${type}] ${message}`;
  
  if (error) {
    logEntry += `\nError Details: ${error.message}`;
    if (error.stack) {
      logEntry += `\nStack Trace: ${error.stack}`;
    }
  }
  
  logEntry += '\n' + '='.repeat(80) + '\n';
  return logEntry;
}

export function logError(type, message, error = null) {
  const logEntry = formatLog(type, message, error);
  
  // Write to console
  console.error(logEntry);
  
  // Write to file
  try {
    fs.appendFileSync(errorLogFile, logEntry);
  } catch (fileError) {
    console.error('Failed to write to error log file:', fileError.message);
  }
}

export function logInfo(message) {
  const logEntry = formatLog('INFO', message);
  
  console.log(logEntry);
  
  try {
    fs.appendFileSync(errorLogFile, logEntry);
  } catch (fileError) {
    console.error('Failed to write to log file:', fileError.message);
  }
}

// Function to clear old logs (keeps last 1000 lines)
export function cleanupLogs() {
  try {
    if (fs.existsSync(errorLogFile)) {
      const content = fs.readFileSync(errorLogFile, 'utf8');
      const lines = content.split('\n');
      
      if (lines.length > 1000) {
        const recentLines = lines.slice(-1000);
        fs.writeFileSync(errorLogFile, recentLines.join('\n'));
        logInfo('Log file cleaned up - kept last 1000 lines');
      }
    }
  } catch (error) {
    console.error('Failed to cleanup logs:', error.message);
  }
}