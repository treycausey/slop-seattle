// Keyboard shortcuts leave form-field input alone.
export function isTypingInField(e) {
  return e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT');
}
