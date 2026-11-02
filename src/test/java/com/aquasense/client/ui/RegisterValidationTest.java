package com.aquasense.client.ui;

import static org.assertj.core.api.Assertions.assertThat;

import com.aquasense.client.ui.view.RegisterView;
import org.junit.jupiter.api.Test;

class RegisterValidationTest {

    @Test
    void validatesEachRuleWithClearMessages() {
        assertThat(RegisterView.validate("", "a@b.co", "Clave1234", "Clave1234")).contains("nombre");
        assertThat(RegisterView.validate("Ana", "no-es-correo", "Clave1234", "Clave1234")).contains("correo");
        assertThat(RegisterView.validate("Ana", "a@b.co", "corta1", "corta1")).contains("8 y 72");
        assertThat(RegisterView.validate("Ana", "a@b.co", "SoloLetras", "SoloLetras")).contains("8 y 72");
        assertThat(RegisterView.validate("Ana", "a@b.co", "Clave1234", "Otra12345")).contains("no coinciden");
        assertThat(RegisterView.validate("Ana", "a@b.co", "Clave1234", "Clave1234")).isNull();
    }
}
