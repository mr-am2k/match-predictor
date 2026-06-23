package byteblaze.backend.fixture.admin.dto;

/**
 * A single goal/assist line in the admin editor, aggregated per player.
 * For goals, {@code ownGoal} distinguishes own goals (which never count toward
 * a player's scorer tally).
 */
public record EventLine(
        Long playerId,
        String playerName,
        Long teamId,
        int count,
        boolean ownGoal
) {
}
