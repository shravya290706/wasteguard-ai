/**
 * Fallback message generator - NO AI, rule-based logic
 * Used when Gemini API fails or is unavailable
 */

export function getUrgencyTone(expiryDays) {
  if (expiryDays <= 3) return 'urgent'
  if (expiryDays <= 7) return 'moderate'
  return 'low'
}

export function generateExplanation(itemName, expiryDays, quantity) {
  const urgency = getUrgencyTone(expiryDays)

  if (urgency === 'urgent') {
    return `🔴 CRITICAL: ${itemName} expires in ${expiryDays} day${expiryDays !== 1 ? 's' : ''} (${quantity}kg stock). Immediate redistribution required to prevent waste.`
  }

  if (urgency === 'moderate') {
    return `🟡 WARNING: ${itemName} expires in ${expiryDays} days (${quantity}kg stock). Schedule redistribution within 24-48 hours.`
  }

  return `🟢 INFO: ${itemName} has ${expiryDays} days until expiry (${quantity}kg stock). Consider proactive redistribution planning.`
}

export function generateSuggestedActions(itemName, expiryDays, quantity, storeName, ngoName) {
  const urgency = getUrgencyTone(expiryDays)
  const actions = []

  if (urgency === 'urgent') {
    actions.push(`1. Contact ${ngoName} immediately for emergency pickup`)
    actions.push(`2. Prepare ${quantity}kg of ${itemName} for immediate dispatch`)
    actions.push(`3. Notify backup NGOs if primary contact unavailable`)
    actions.push(`4. Document handover with photos for compliance`)
  } else if (urgency === 'moderate') {
    actions.push(`1. Schedule pickup with ${ngoName} for next 24-48 hours`)
    actions.push(`2. Verify NGO capacity can accommodate ${quantity}kg`)
    actions.push(`3. Arrange transport logistics with priority`)
    actions.push(`4. Prepare packaging and documentation`)
  } else {
    actions.push(`1. Add to weekly redistribution queue`)
    actions.push(`2. Monitor inventory levels at ${storeName}`)
    actions.push(`3. Coordinate with ${ngoName} for scheduled pickup`)
    actions.push(`4. Update beneficiary demand forecast`)
  }

  return actions.join('\n')
}

export function generateRedistributionMessage(
  storeName,
  itemName,
  quantity,
  expiryDays,
  ngoName
) {
  const urgency = getUrgencyTone(expiryDays)

  const greeting = 'Dear NGO Coordinator,'

  const messageBody = (() => {
    if (urgency === 'urgent') {
      return `\nWe have an urgent redistribution request from ${storeName}.\n\n` +
        `📦 Item: ${itemName}\n` +
        `📊 Quantity: ${quantity} kg\n` +
        `⏰ Expires: In ${expiryDays} day${expiryDays !== 1 ? 's' : ''} (CRITICAL)\n` +
        `📍 Location: ${storeName}\n\n` +
        `This is a HIGH-RISK situation requiring immediate action. Please confirm emergency pickup availability within the next 2 hours.\n` +
        `Without intervention, this stock will be wasted. Your immediate support can help save food and benefit vulnerable communities.`
    } else if (urgency === 'moderate') {
      return `\nWe have a redistribution request from ${storeName}.\n\n` +
        `📦 Item: ${itemName}\n` +
        `📊 Quantity: ${quantity} kg\n` +
        `⏰ Expires: In ${expiryDays} days (Medium Priority)\n` +
        `📍 Location: ${storeName}\n\n` +
        `This stock needs to be redistributed within the next 24-48 hours. Please confirm your availability and preferred pickup time.\n` +
        `Early action will maximize the benefit to communities we serve.`
    } else {
      return `\nWe have a proactive redistribution opportunity from ${storeName}.\n\n` +
        `📦 Item: ${itemName}\n` +
        `📊 Quantity: ${quantity} kg\n` +
        `⏰ Expires: In ${expiryDays} days (Planned Distribution)\n` +
        `📍 Location: ${storeName}\n\n` +
        `This stock is available for regular redistribution. Please let us know your preferred pickup schedule.\n` +
        `This allows for better planning and sustained community support.`
    }
  })()

  const closing = '\nThank you for your partnership in reducing food waste.\n\nBest regards,\nWasteGuard AI System'

  return `${greeting}${messageBody}${closing}`
}

export function generateFallbackMessage(
  storeName,
  itemName,
  quantity,
  expiryDays,
  ngoName
) {
  return {
    explanation: generateExplanation(itemName, expiryDays, quantity),
    suggested_actions: generateSuggestedActions(itemName, expiryDays, quantity, storeName, ngoName),
    message: generateRedistributionMessage(storeName, itemName, quantity, expiryDays, ngoName),
  }
}
