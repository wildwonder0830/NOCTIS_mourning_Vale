/* Keep model commentary out of phone messages and canonical phone context. */
(() => {
  'use strict';
  const instructions = 'Phone mode overrides prose-format instructions for this response. Return only the final in-character message (or the requested group message lines). Do not include analysis, reasoning, planning, prompt summaries, or explanations of the task.';
  const warning = 'Model commentary hidden — this was not a character message.';
  function clean(value) {
    let text = String(value ?? '').trim();
    // Remove only explicitly delimited reasoning; never guess where free-form
    // planning ends and a supposed final message begins.
    text = text.replace(/<(think|thinking|analysis|reasoning)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').trim();
    const meta = /^(?:[\s*#`>]*)(?:the user (?:wants|asks|asked|is asking|has asked)\b|(?:i need|i have|i should) to (?:write|generate|compose|produce|craft) (?:an? |one |the )?(?:unsolicited |text |phone |in-character |character )*(?:message|reply|response)\b|(?:analysis|reasoning|chain of thought)\s*:|(?:let me|i need to) (?:analy[sz]e|review) (?:the |this )?(?:prompt|request|context)\b)/im;
    if (!text || /<\/?(?:think|thinking|analysis|reasoning)\b|\[\/?(?:analysis|reasoning)\]|<\|(?:analysis|channel|im_start)\|>/i.test(text) || meta.test(text)) {
      throw new Error('The model returned planning text instead of a phone message. No character reply was added. You can try again.');
    }
    return text;
  }
  function history(messages) {
    return messages.flatMap(message => {
      if (message.role !== 'assistant') return [message];
      try { return [{...message, text:clean(message.text)}]; }
      catch { return []; }
    });
  }
  function display(message) {
    if (message.role !== 'assistant') return message.text;
    try { return clean(message.text); } catch { return warning; }
  }
  function named(contact) {
    return Boolean(String(contact?.name || '').trim()) && !/^(?:new character|character|contact(?:\s+\d+)?|unnamed)$/i.test(String(contact.name).trim());
  }
  window.NoctisPhoneOutput = {clean, history, display, named, instructions};
})();
