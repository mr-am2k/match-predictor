package byteblaze.backend.competition.controller;

import byteblaze.backend.competition.dto.CompetitionResponse;
import byteblaze.backend.competition.service.CompetitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/competitions")
@RequiredArgsConstructor
public class CompetitionController {

    private final CompetitionService competitionService;

    @GetMapping
    public ResponseEntity<List<CompetitionResponse>> listCompetitions() {
        return ResponseEntity.ok(competitionService.listActiveCompetitions());
    }
}
