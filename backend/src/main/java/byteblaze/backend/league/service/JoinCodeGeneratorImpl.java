package byteblaze.backend.league.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
public class JoinCodeGeneratorImpl implements JoinCodeGenerator {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 6;

    private final SecureRandom random = new SecureRandom();

    @Override
    public String generate() {
        final StringBuilder code = new StringBuilder(CODE_LENGTH);

        for (int i = 0; i < CODE_LENGTH; i++) {
            code.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }

        return code.toString();
    }
}
