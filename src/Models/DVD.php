<?php

declare(strict_types=1);

namespace App\Models;

class DVD extends LibraryItem
{
    public string $director;
    public int $duration;

    public function __construct(int $id, string $title, int $publicationYear, string $director, int $duration, bool $isAvailable = true)
    {
        parent::__construct($id, $title, $publicationYear, $isAvailable);
        $this->director = $director;
        $this->duration = $duration;
    }

    public function getItemDetails(): string
    {
        return sprintf("DVD: %s (%s) — Director: %s — %d min", $this->title, $this->publicationYear, $this->director, $this->duration);
    }
}
