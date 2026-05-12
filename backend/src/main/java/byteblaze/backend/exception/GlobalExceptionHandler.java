package byteblaze.backend.exception;

import byteblaze.backend.auth.exception.AuthException;
import byteblaze.backend.competition.exception.CompetitionInactiveException;
import byteblaze.backend.competition.exception.CompetitionNotFoundException;
import byteblaze.backend.league.exception.JoinCodeGenerationException;
import byteblaze.backend.league.exception.LeagueAccessDeniedException;
import byteblaze.backend.league.exception.LeagueJoinCodeNotFoundException;
import byteblaze.backend.league.exception.LeagueNotFoundException;
import byteblaze.backend.league.exception.LeagueNotPublicException;
import byteblaze.backend.overall.exception.OverallPredictionLockedException;
import byteblaze.backend.prediction.exception.FixtureLockedException;
import byteblaze.backend.prediction.exception.FixtureNotFoundException;
import byteblaze.backend.prediction.exception.FixtureNotInLeagueException;
import byteblaze.backend.prediction.exception.NotALeagueMemberException;
import byteblaze.backend.prediction.exception.PredictionValidationException;
import byteblaze.backend.scoring.rules.exception.OnlyOwnerCanEditScoringRulesException;
import byteblaze.backend.scoring.rules.exception.ScoringRulesLockedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AuthException.class)
    public ProblemDetail handleAuthException(AuthException ex) {
        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNAUTHORIZED,
                ex.getMessage()
        );

        problemDetail.setTitle("Authentication Error");
        problemDetail.setType(URI.create("https://api.example.com/errors/authentication"));

        return problemDetail;
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ProblemDetail handleBadCredentialsException(BadCredentialsException ex) {
        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNAUTHORIZED,
                "Invalid email or password"
        );

        problemDetail.setTitle("Authentication Error");
        problemDetail.setType(URI.create("https://api.example.com/errors/bad-credentials"));

        return problemDetail;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationException(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage())
        );

        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Validation failed"
        );

        problemDetail.setTitle("Validation Error");
        problemDetail.setType(URI.create("https://api.example.com/errors/validation"));
        problemDetail.setProperty("errors", errors);

        return problemDetail;
    }

    @ExceptionHandler(CompetitionNotFoundException.class)
    public ProblemDetail handleCompetitionNotFoundException(CompetitionNotFoundException ex) {
        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                ex.getMessage()
        );

        problemDetail.setTitle("Competition Not Found");
        problemDetail.setType(URI.create("https://api.example.com/errors/competition-not-found"));

        return problemDetail;
    }

    @ExceptionHandler(CompetitionInactiveException.class)
    public ProblemDetail handleCompetitionInactiveException(CompetitionInactiveException ex) {
        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                ex.getMessage()
        );

        problemDetail.setTitle("Competition Inactive");
        problemDetail.setType(URI.create("https://api.example.com/errors/competition-inactive"));

        return problemDetail;
    }

    @ExceptionHandler(LeagueNotFoundException.class)
    public ProblemDetail handleLeagueNotFoundException(LeagueNotFoundException ex) {
        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                ex.getMessage()
        );

        problemDetail.setTitle("League Not Found");
        problemDetail.setType(URI.create("https://api.example.com/errors/league-not-found"));

        return problemDetail;
    }

    @ExceptionHandler(LeagueAccessDeniedException.class)
    public ProblemDetail handleLeagueAccessDeniedException(LeagueAccessDeniedException ex) {
        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN,
                ex.getMessage()
        );

        problemDetail.setTitle("League Access Denied");
        problemDetail.setType(URI.create("https://api.example.com/errors/league-access-denied"));

        return problemDetail;
    }

    @ExceptionHandler(JoinCodeGenerationException.class)
    public ProblemDetail handleJoinCodeGenerationException(JoinCodeGenerationException ex) {
        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                ex.getMessage()
        );

        problemDetail.setTitle("Join Code Generation Failed");
        problemDetail.setType(URI.create("https://api.example.com/errors/join-code-generation"));

        return problemDetail;
    }

    @ExceptionHandler(LeagueJoinCodeNotFoundException.class)
    public ProblemDetail handleLeagueJoinCodeNotFoundException(LeagueJoinCodeNotFoundException ex) {
        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                ex.getMessage()
        );

        problemDetail.setTitle("League Join Code Not Found");
        problemDetail.setType(URI.create("https://api.example.com/errors/league-join-code-not-found"));

        return problemDetail;
    }

    @ExceptionHandler(LeagueNotPublicException.class)
    public ProblemDetail handleLeagueNotPublicException(LeagueNotPublicException ex) {
        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN,
                ex.getMessage()
        );

        problemDetail.setTitle("League Not Public");
        problemDetail.setType(URI.create("https://api.example.com/errors/league-not-public"));

        return problemDetail;
    }

    @ExceptionHandler(FixtureLockedException.class)
    public ProblemDetail handleFixtureLockedException(FixtureLockedException ex) {
        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.LOCKED,
                ex.getMessage()
        );

        problemDetail.setTitle("Fixture Locked");
        problemDetail.setType(URI.create("https://api.example.com/errors/fixture-locked"));

        return problemDetail;
    }

    @ExceptionHandler(OverallPredictionLockedException.class)
    public ProblemDetail handleOverallPredictionLockedException(OverallPredictionLockedException ex) {
        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.LOCKED,
                ex.getMessage()
        );

        problemDetail.setTitle("Overall Prediction Locked");
        problemDetail.setType(URI.create("https://api.example.com/errors/overall-prediction-locked"));

        return problemDetail;
    }

    @ExceptionHandler(ScoringRulesLockedException.class)
    public ProblemDetail handleScoringRulesLockedException(ScoringRulesLockedException ex) {
        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.LOCKED,
                ex.getMessage()
        );

        problemDetail.setTitle("Scoring Rules Locked");
        problemDetail.setType(URI.create("https://api.example.com/errors/scoring-rules-locked"));

        return problemDetail;
    }

    @ExceptionHandler(OnlyOwnerCanEditScoringRulesException.class)
    public ProblemDetail handleOnlyOwnerCanEditScoringRulesException(OnlyOwnerCanEditScoringRulesException ex) {
        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN,
                ex.getMessage()
        );

        problemDetail.setTitle("Scoring Rules Edit Forbidden");
        problemDetail.setType(URI.create("https://api.example.com/errors/scoring-rules-edit-forbidden"));

        return problemDetail;
    }

    @ExceptionHandler(PredictionValidationException.class)
    public ProblemDetail handlePredictionValidationException(PredictionValidationException ex) {
        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                ex.getMessage()
        );

        problemDetail.setTitle("Invalid Prediction");
        problemDetail.setType(URI.create("https://api.example.com/errors/prediction-validation"));

        return problemDetail;
    }

    @ExceptionHandler(NotALeagueMemberException.class)
    public ProblemDetail handleNotALeagueMemberException(NotALeagueMemberException ex) {
        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN,
                ex.getMessage()
        );

        problemDetail.setTitle("Not a League Member");
        problemDetail.setType(URI.create("https://api.example.com/errors/not-a-league-member"));

        return problemDetail;
    }

    @ExceptionHandler(FixtureNotInLeagueException.class)
    public ProblemDetail handleFixtureNotInLeagueException(FixtureNotInLeagueException ex) {
        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                ex.getMessage()
        );

        problemDetail.setTitle("Fixture Not In League");
        problemDetail.setType(URI.create("https://api.example.com/errors/fixture-not-in-league"));

        return problemDetail;
    }

    @ExceptionHandler(FixtureNotFoundException.class)
    public ProblemDetail handleFixtureNotFoundException(FixtureNotFoundException ex) {
        final ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND,
                ex.getMessage()
        );

        problemDetail.setTitle("Fixture Not Found");
        problemDetail.setType(URI.create("https://api.example.com/errors/fixture-not-found"));

        return problemDetail;
    }
}
