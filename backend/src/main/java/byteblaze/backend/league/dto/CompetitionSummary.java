package byteblaze.backend.league.dto;

public record CompetitionSummary(
        Long id,
        String name,
        String logoUrl,
        String countryName,
        String countryFlagUrl,
        Integer seasonYear
) {
}
