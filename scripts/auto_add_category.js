#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Utility to normalize a string to a valid enum key
function toEnumKey(str) {
  return str
    .replace(/[^a-zA-Z0-9]+/g, ' ') // Remove non-alphanumeric
    .trim()
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/ (.)/g, (_, c) => c.toUpperCase()) // CamelCase
    .replace(/^./, c => c.toUpperCase()) // Capitalize first
    .replace(/ /g, '');
}

function toEnumValue(str) {
  return str.replace(/\s+/g, ' ').replace(/(^|\s)\S/g, l => l.toUpperCase()).trim();
}

function updateEnum(filePath, enumName, key, value) {
  let content = fs.readFileSync(filePath, 'utf8');
  const enumRegex = new RegExp(`export enum ${enumName} \{([\s\S]*?)\}`, 'm');
  const match = content.match(enumRegex);
  if (!match) throw new Error(`Enum ${enumName} not found in ${filePath}`);
  if (match[1].includes(`${key} =`)) return false; // Already exists
  // Insert before the last }
  const insert = `  ${key} = "${value}",\n`;
  content = content.replace(enumRegex, (m, body) => `export enum ${enumName} {\n${body}${insert}}`);
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function updateTranslation(filePath, key, value) {
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (json[key]) return false;
  json[key] = value;
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
  return true;
}

function main() {
  const category = process.argv.slice(2).join(' ').trim();
  if (!category) {
    console.error('Usage: node scripts/auto_add_category.js "New Category Name"');
    process.exit(1);
  }
  const enumKey = toEnumKey(category);
  const enumValue = toEnumValue(category);
  const translationKey = `taskCategories.${enumKey}`;

  // Backend
  const backendEnumPath = path.join(__dirname, '../backend/src/types.ts');
  // Frontend
  const frontendEnumPath = path.join(__dirname, '../frontend/types.ts');
  // Translations
  const locales = [
    path.join(__dirname, '../frontend/locales/en.json'),
    path.join(__dirname, '../frontend/locales/ar.json'),
    path.join(__dirname, '../frontend/public/locales/en.json'),
    path.join(__dirname, '../frontend/public/locales/ar.json'),
  ];

  let changed = false;
  changed |= updateEnum(backendEnumPath, 'TaskCategory', enumKey, enumValue);
  changed |= updateEnum(frontendEnumPath, 'TaskCategory', enumKey, enumValue);
  for (const loc of locales) {
    changed |= updateTranslation(loc, translationKey, enumValue);
  }
  if (changed) {
    console.log(`Added category '${enumValue}' as '${enumKey}' to enums and translations.`);
  } else {
    console.log(`Category '${enumValue}' already exists in enums and translations.`);
  }
}

main(); 