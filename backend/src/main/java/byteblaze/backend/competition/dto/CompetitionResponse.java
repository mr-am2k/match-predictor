package byteblaze.backend.competition.dto;

import byteblaze.backend.competition.entity.Competition;

import java.time.LocalDate;

public record CompetitionResponse(
        Long id,
        String name,
        String logoUrl,
        String countryName,
        String countryFlagUrl,
        Integer seasonYear,
        LocalDate seasonStart,
        LocalDate seasonEnd
) {
    public static CompetitionResponse from(Competition competition) {
        return new CompetitionResponse(
                competition.getId(),
                competition.getName(),
                competition.getLogoUrl(),
                competition.getCountryName(),
                competition.getCountryFlagUrl(),
                competition.getSeasonYear(),
                competition.getSeasonStart(),
                competition.getSeasonEnd()
        );
    }
}
