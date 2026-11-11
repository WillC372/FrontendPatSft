import test from "node:test";
import assert from "node:assert/strict";
import { copyText, liveText } from "../js/views/AnswerText.js";

const WHO = { id: "who-ph-1", organization: "OMS", title: "Guías para la calidad del agua potable", section: "pH", url: "https://www.who.int/x" };
const CDC = { id: "cdc-mahc-2024-ph", organization: "CDC", title: "Model Aquatic Health Code", section: "", url: "https://www.cdc.gov/y" };

test("while it is written, bold marks and reference ids are hidden, also one cut in half", () => {
  assert.equal(liveText("El **pH** ideal [who-ph-1] es 7."), "El pH ideal  es 7.");
  assert.equal(liveText("Entre 7,2 y 7,8 [cdc-ma"), "Entre 7,2 y 7,8 ");
  assert.equal(liveText("Entre 7,2 y 7,8 [cdc-mahc-"), "Entre 7,2 y 7,8 ");
});

test("ordinary brackets and numbers are kept while writing", () => {
  assert.equal(liveText("Rango [6,5 a 8,5]"), "Rango [6,5 a 8,5]");
  assert.equal(liveText("Ver nota [1]"), "Ver nota [1]");
});

test("copied text numbers the references in citation order and lists the sources", () => {
  const text = copyText("Piscinas: 7,2 a 7,8 [cdc-mahc-2024-ph]. Agua potable: 6,5 a 8,5 [who-ph-1].", [WHO, CDC]);
  assert.equal(text, "Piscinas: 7,2 a 7,8 [2]. Agua potable: 6,5 a 8,5 [1].\n\nFuentes:\n"
    + "[1] OMS, Guías para la calidad del agua potable (pH). https://www.who.int/x\n"
    + "[2] CDC, Model Aquatic Health Code. https://www.cdc.gov/y");
});

test("a reference that is not among the verified citations is dropped from the copy", () => {
  assert.equal(copyText("Dato [inventada-ref-9] y **más**.", []), "Dato  y más.");
});
