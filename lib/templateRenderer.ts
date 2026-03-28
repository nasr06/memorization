/**
 * Renders an Anki card template by substituting field values.
 * Handles: {{FieldName}}, {{FrontSide}}, {{#Field}}...{{/Field}}, {{^Field}}...{{/Field}}
 */
export function renderAnkiTemplate(
  template: string,
  fields: Record<string, string>,
  frontRendered?: string
): string {
  let result = template;

  // Replace {{FrontSide}} with the rendered front
  if (frontRendered !== undefined) {
    result = result.replace(/\{\{FrontSide\}\}/g, frontRendered);
  }

  // Handle conditional blocks: {{#FieldName}}content{{/FieldName}}
  result = result.replace(
    /\{\{#([\w\s:]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, fieldName, content) =>
      fields[fieldName.trim()] ? content : ""
  );

  // Handle negative conditional blocks: {{^FieldName}}content{{/FieldName}}
  result = result.replace(
    /\{\{\^([\w\s:]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, fieldName, content) =>
      !fields[fieldName.trim()] ? content : ""
  );

  // Substitute field values (including type: and cloze: prefixed ones)
  Object.entries(fields).forEach(([name, value]) => {
    // {{FieldName}} and {{type:FieldName}} and {{cloze:FieldName}}
    result = result.replace(
      new RegExp(`\\{\\{(?:[a-z]+:)?${escapeRegex(name)}\\}\\}`, "g"),
      value
    );
  });

  // Remove any remaining unresolved {{...}} placeholders
  result = result.replace(/\{\{[^}]*\}\}/g, "");

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
