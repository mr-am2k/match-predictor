package byteblaze.backend.fixture.admin.controller;

import byteblaze.backend.fixture.admin.dto.AdminFixtureDetail;
import byteblaze.backend.fixture.admin.dto.AdminFixtureSummary;
import byteblaze.backend.fixture.admin.dto.EditFixtureResultRequest;
import byteblaze.backend.fixture.admin.dto.EditFixtureResultResponse;
import byteblaze.backend.fixture.admin.service.FixtureAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Admin-only endpoints for manually correcting fixture results and triggering a
 * points recalculation.
 *
 * Mapped under {@code /api/v1/admin/**} which {@code SecurityConfig} restricts
 * to {@code ROLE_ADMIN}.
 */
@RestController
@RequestMapping("/api/v1/admin/fixtures")
@RequiredArgsConstructor
public class FixtureAdminController {

    private final FixtureAdminService fixtureAdminService;

    @GetMapping("/rounds")
    public List<String> listRounds(@RequestParam Long competitionId) {
        return fixtureAdminService.listRounds(competitionId);
    }

    @GetMapping
    public List<AdminFixtureSummary> listFixtures(
            @RequestParam Long competitionId,
            @RequestParam(required = false) String round
    ) {
        return fixtureAdminService.listFixtures(competitionId, round);
    }

    @GetMapping("/{id}")
    public AdminFixtureDetail getFixture(@PathVariable Long id) {
        return fixtureAdminService.getFixture(id);
    }

    @PutMapping("/{id}/result")
    public EditFixtureResultResponse editResult(
            @PathVariable Long id,
            @Valid @RequestBody EditFixtureResultRequest request
    ) {
        return fixtureAdminService.editResult(id, request);
    }
}
