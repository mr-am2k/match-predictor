package byteblaze.backend.league;

import byteblaze.backend.league.service.JoinCodeGeneratorImpl;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class JoinCodeGeneratorImplTest {

    private static final String EXPECTED_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int EXPECTED_LENGTH = 6;

    private final JoinCodeGeneratorImpl generator = new JoinCodeGeneratorImpl();

    @Test
    void generate_returnsCodeOfExpectedLength() {
        String code = generator.generate();

        assertThat(code).hasSize(EXPECTED_LENGTH);
    }

    @Test
    void generate_usesOnlyApprovedAlphabet() {
        for (int i = 0; i < 100; i++) {
            String code = generator.generate();
            assertThat(code).matches("[" + EXPECTED_ALPHABET + "]+");
        }
    }

    @Test
    void generate_producesHighEntropyCodes() {
        Set<String> codes = new HashSet<>();
        for (int i = 0; i < 1_000; i++) {
            codes.add(generator.generate());
        }

        assertThat(codes).hasSizeGreaterThan(990);
    }

    @Test
    void generate_excludesAmbiguousCharacters() {
        for (int i = 0; i < 200; i++) {
            String code = generator.generate();
            assertThat(code).doesNotContainAnyWhitespaces();
            assertThat(code).doesNotContain("0", "O", "1", "I");
        }
    }
}
