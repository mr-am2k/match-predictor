package byteblaze.backend.fixture.entity;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;

public enum FixtureStatus {
    NS("NS"),
    TBD("TBD"),
    ONE_H("1H"),
    HT("HT"),
    TWO_H("2H"),
    ET("ET"),
    BT("BT"),
    P("P"),
    SUSP("SUSP"),
    INT("INT"),
    FT("FT"),
    AET("AET"),
    PEN("PEN"),
    PST("PST"),
    CANC("CANC"),
    ABD("ABD"),
    AWD("AWD"),
    WO("WO"),
    LIVE("LIVE");

    private final String apiCode;

    FixtureStatus(String apiCode) {
        this.apiCode = apiCode;
    }

    public String apiCode() {
        return apiCode;
    }

    public static final Set<FixtureStatus> FINAL = EnumSet.of(FT, AET, PEN);
    public static final Set<FixtureStatus> CANCELLED = EnumSet.of(PST, CANC, ABD, AWD, WO);

    public boolean isFinal() {
        return FINAL.contains(this);
    }

    public boolean isCancelled() {
        return CANCELLED.contains(this);
    }

    public boolean isUnfinished() {
        return !isFinal() && !isCancelled();
    }

    public static FixtureStatus fromApiCode(String code) {
        if (code == null) {
            return null;
        }

        return Arrays.stream(values())
                .filter(s -> s.apiCode.equals(code))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown FixtureStatus api code: " + code));
    }
}
